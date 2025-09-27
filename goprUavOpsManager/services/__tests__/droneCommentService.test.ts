// Mock all external dependencies BEFORE imports
jest.mock('@/repositories/DroneCommentRepository', () => ({
  DroneCommentRepository: {
    getDroneComments: jest.fn(),
    getDroneComment: jest.fn(),
    createDroneComment: jest.fn(),
    updateDroneComment: jest.fn(),
    softDeleteDroneComment: jest.fn(),
    restoreDroneComment: jest.fn(),
    getPaginatedDroneComments: jest.fn(),
  }
}));

jest.mock('../auditLogService', () => ({
  AuditLogService: {
    createAuditLog: jest.fn().mockResolvedValue('audit-log-id'),
    createChangeDetails: jest.fn().mockReturnValue('Drone comment created'),
  }
}));

jest.mock('../userService', () => ({
  UserService: {
    getUserDisplayName: jest.fn().mockResolvedValue('John Doe'),
  }
}));

jest.mock('../imageService', () => ({
  ImageService: {
    processImages: jest.fn().mockResolvedValue(['https://processed-image.jpg']),
  }
}));

import { DroneCommentService } from '../droneCommentService';
import { UserRole } from '@/types/UserRole';
import { CommentVisibility, DroneComment } from '@/types/DroneComment';
import { DroneCommentRepository } from '@/repositories/DroneCommentRepository';
import { AuditLogService } from '../auditLogService';
import { UserService } from '../userService';
import { ImageService } from '../imageService';

// Get references to mocked functions
const mockDroneCommentRepository = DroneCommentRepository as jest.Mocked<typeof DroneCommentRepository>;
const mockAuditLogService = AuditLogService as jest.Mocked<typeof AuditLogService>;
const mockUserService = UserService as jest.Mocked<typeof UserService>;
const mockImageService = ImageService as jest.Mocked<typeof ImageService>;

// Test data
const mockComment: DroneComment = {
  id: 'comment-1',
  droneId: 'drone-1',
  userId: 'user-1',
  userEmail: 'user@example.com',
  userName: 'John Doe',
  content: 'This drone works great!',
  images: ['https://example.com/image.jpg'],
  visibility: 'public' as CommentVisibility,
  isDeleted: false,
  createdAt: new Date(),
};

const mockDroneCommentCreateData = {
  droneId: 'drone-1',
  content: 'Test comment',
  images: ['data:image/jpeg;base64,test'],
  visibility: 'public' as CommentVisibility,
};

describe('DroneCommentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDroneComment', () => {
    it('should fetch a single comment successfully', async () => {
      mockDroneCommentRepository.getDroneComment.mockResolvedValue(mockComment);

      const result = await DroneCommentService.getDroneComment('comment-1');

      expect(result).toEqual(mockComment);
      expect(mockDroneCommentRepository.getDroneComment).toHaveBeenCalledWith('comment-1');
    });

    it('should return null if comment not found', async () => {
      mockDroneCommentRepository.getDroneComment.mockResolvedValue(null);

      const result = await DroneCommentService.getDroneComment('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('createDroneComment', () => {
    it('should create a comment with images successfully', async () => {
      mockDroneCommentRepository.createDroneComment.mockResolvedValue('comment-1');
      mockDroneCommentRepository.updateDroneComment.mockResolvedValue();

      const result = await DroneCommentService.createDroneComment(
        mockDroneCommentCreateData,
        UserRole.USER,
        'user-1',
        'user@example.com'
      );

      expect(result).toBe('comment-1');
      expect(mockUserService.getUserDisplayName).toHaveBeenCalledWith('user-1');
      expect(mockImageService.processImages).toHaveBeenCalledWith(
        mockDroneCommentCreateData.images,
        'droneComments/images/drone-1',
        expect.any(String)
      );
      expect(mockDroneCommentRepository.createDroneComment).toHaveBeenCalled();
      expect(mockAuditLogService.createAuditLog).toHaveBeenCalled();
    });

    it('should create a comment without images', async () => {
      const commentDataNoImages = { ...mockDroneCommentCreateData, images: [] };
      mockDroneCommentRepository.createDroneComment.mockResolvedValue('comment-2');

      const result = await DroneCommentService.createDroneComment(
        commentDataNoImages,
        UserRole.USER,
        'user-1',
        'user@example.com'
      );

      expect(result).toBe('comment-2');
      expect(mockImageService.processImages).not.toHaveBeenCalled();
      expect(mockDroneCommentRepository.updateDroneComment).not.toHaveBeenCalled();
    });

    it('should throw error if user is not authenticated', async () => {
      await expect(
        DroneCommentService.createDroneComment(
          mockDroneCommentCreateData,
          UserRole.USER,
          '', // empty userId
          'user@example.com'
        )
      ).rejects.toThrow('User authentication required to create comments');
    });
  });

  describe('deleteDroneComment', () => {
    it('should allow admin to delete comment', async () => {
      mockDroneCommentRepository.getDroneComment.mockResolvedValue(mockComment);
      mockDroneCommentRepository.softDeleteDroneComment.mockResolvedValue();

      await DroneCommentService.deleteDroneComment(
        'comment-1',
        UserRole.ADMIN,
        'admin-1',
        'admin@example.com'
      );

      expect(mockDroneCommentRepository.softDeleteDroneComment).toHaveBeenCalledWith(
        'comment-1',
        'admin-1'
      );
      expect(mockAuditLogService.createAuditLog).toHaveBeenCalled();
    });

    it('should allow manager to delete comment', async () => {
      mockDroneCommentRepository.getDroneComment.mockResolvedValue(mockComment);
      mockDroneCommentRepository.softDeleteDroneComment.mockResolvedValue();

      await DroneCommentService.deleteDroneComment(
        'comment-1',
        UserRole.MANAGER,
        'manager-1',
        'manager@example.com'
      );

      expect(mockDroneCommentRepository.softDeleteDroneComment).toHaveBeenCalled();
    });

    it('should deny regular user from deleting comment', async () => {
      await expect(
        DroneCommentService.deleteDroneComment(
          'comment-1',
          UserRole.USER,
          'user-1',
          'user@example.com'
        )
      ).rejects.toThrow('Permission denied: Only managers and admins can delete comments');
    });

    it('should throw error if comment not found', async () => {
      mockDroneCommentRepository.getDroneComment.mockResolvedValue(null);

      await expect(
        DroneCommentService.deleteDroneComment(
          'non-existent',
          UserRole.ADMIN,
          'admin-1',
          'admin@example.com'
        )
      ).rejects.toThrow('Comment not found');
    });
  });

  describe('restoreDroneComment', () => {
    it('should allow admin to restore comment', async () => {
      const deletedComment = { ...mockComment, isDeleted: true };
      mockDroneCommentRepository.getDroneComment.mockResolvedValue(deletedComment);
      mockDroneCommentRepository.restoreDroneComment.mockResolvedValue();

      await DroneCommentService.restoreDroneComment(
        'comment-1',
        UserRole.ADMIN,
        'admin-1',
        'admin@example.com'
      );

      expect(mockDroneCommentRepository.restoreDroneComment).toHaveBeenCalledWith(
        'comment-1',
        'admin-1'
      );
      expect(mockAuditLogService.createAuditLog).toHaveBeenCalled();
    });

    it('should deny manager from restoring comment', async () => {
      await expect(
        DroneCommentService.restoreDroneComment(
          'comment-1',
          UserRole.MANAGER,
          'manager-1',
          'manager@example.com'
        )
      ).rejects.toThrow('Permission denied: Only admins can restore comments');
    });

    it('should deny regular user from restoring comment', async () => {
      await expect(
        DroneCommentService.restoreDroneComment(
          'comment-1',
          UserRole.USER,
          'user-1',
          'user@example.com'
        )
      ).rejects.toThrow('Permission denied: Only admins can restore comments');
    });
  });

  describe('permission methods', () => {
    it('should correctly identify who can view hidden comments', () => {
      expect(DroneCommentService.canViewHiddenComments(UserRole.ADMIN)).toBe(true);
      expect(DroneCommentService.canViewHiddenComments(UserRole.MANAGER)).toBe(true);
      expect(DroneCommentService.canViewHiddenComments(UserRole.USER)).toBe(false);
    });

    it('should correctly identify who can delete comments', () => {
      expect(DroneCommentService.canDeleteComments(UserRole.ADMIN)).toBe(true);
      expect(DroneCommentService.canDeleteComments(UserRole.MANAGER)).toBe(true);
      expect(DroneCommentService.canDeleteComments(UserRole.USER)).toBe(false);
    });

    it('should correctly identify who can restore comments', () => {
      expect(DroneCommentService.canRestoreComments(UserRole.ADMIN)).toBe(true);
      expect(DroneCommentService.canRestoreComments(UserRole.MANAGER)).toBe(false);
      expect(DroneCommentService.canRestoreComments(UserRole.USER)).toBe(false);
    });
  });

  describe('getPaginatedDroneComments', () => {
    it('should fetch paginated comments successfully', async () => {
      const mockResponse = {
        comments: [mockComment],
        hasNextPage: true,
        hasPreviousPage: false,
        lastDocumentSnapshot: 'snapshot'
      };
      mockDroneCommentRepository.getPaginatedDroneComments.mockResolvedValue(mockResponse);

      const result = await DroneCommentService.getPaginatedDroneComments(
        'drone-1',
        UserRole.USER,
        'user-1'
      );

      expect(result).toEqual(mockResponse);
      expect(mockDroneCommentRepository.getPaginatedDroneComments).toHaveBeenCalledWith(
        'drone-1',
        UserRole.USER,
        'user-1',
        undefined
      );
    });
  });
});

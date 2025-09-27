// Visibility options for drone comments
export type CommentVisibility = 'public' | 'hidden';

// Drone comment interface
export interface DroneComment {
  id: string;
  droneId: string; // Reference to the drone entity
  userId: string; // Firebase Auth UID of comment creator
  userEmail?: string; // Email for easier identification
  userName?: string; // Display name for easier identification
  content: string; // Comment text content
  images?: string[]; // Array of image URLs (Firebase Storage)
  visibility: CommentVisibility; // 'public' or 'hidden' (only admin/manager can see hidden)
  isDeleted?: boolean; // Soft-delete flag (for admin removal)
  deletedAt?: Date; // Timestamp when comment was deleted/hidden
  deletedBy?: string; // User ID who deleted/hid the comment
  createdAt: Date; // Timestamp when comment was created
  updatedAt?: Date; // Timestamp when comment was last updated (if editing is implemented later)
}

// Form data for creating drone comments
export interface DroneCommentCreateData {
  droneId: string;
  content: string;
  images?: string[]; // Array of image URIs (will be processed/uploaded)
  visibility: CommentVisibility;
}

// Form data for updating drone comments
export interface DroneCommentUpdateData {
  content?: string;
  images?: string[];
  visibility?: CommentVisibility;
}

// Query parameters for fetching drone comments
export interface DroneCommentQuery {
  droneId: string;
  visibility?: CommentVisibility;
  includeDeleted?: boolean; // Only for admin users
  limit?: number;
  orderBy?: 'createdAt' | 'updatedAt';
  orderDirection?: 'asc' | 'desc';
  lastDocumentSnapshot?: any; // For pagination
}

// Paginated drone comment response
export interface PaginatedDroneCommentResponse {
  comments: DroneComment[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  totalCount?: number;
  lastDocumentSnapshot?: any;
}
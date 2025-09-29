export interface DroneClaim {
  id: string;
  droneId: string;
  userId: string;
  userEmail: string;
  startTime: Date;
  endTime?: Date; // undefined means currently active claim
  createdAt: Date;
  updatedAt?: Date;
  createdBy: string; // user ID who created the claim
  updatedBy?: string; // user ID who last updated (for admin overrides)
}

export interface DroneClaimData extends Omit<DroneClaim, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'> {}

export interface DroneClaimQuery {
  droneId?: string;
  userId?: string;
  active?: boolean; // filter for active claims (endTime is null/undefined)
  limit?: number;
  offset?: number;
}

export interface PaginatedDroneClaimResponse {
  claims: DroneClaim[];
  total: number;
  hasMore: boolean;
}
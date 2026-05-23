export interface ListSessionsDto {
  status?: 'WAITING' | 'ACTIVE' | 'ENDED';
  assigneeId?: string;
  limit?: number;
}

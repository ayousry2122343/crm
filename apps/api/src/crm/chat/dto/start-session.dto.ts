export interface StartSessionDto {
  visitorName: string;
  visitorEmail?: string;
  queueId?: string;
  metadata?: Record<string, any>;
}

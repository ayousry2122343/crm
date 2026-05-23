export interface SendMessageDto {
  senderType: 'visitor' | 'agent' | 'system';
  senderId?: string;
  content: string;
}

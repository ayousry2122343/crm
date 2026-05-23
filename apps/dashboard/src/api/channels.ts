import { api as http } from './client';

export interface ChannelConfig {
  id: string;
  workspaceId: string;
  provider: string;
  name: string;
  phoneNumber: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelMessage {
  id: string;
  workspaceId: string;
  channelConfigId: string;
  direction: string;
  from: string;
  to: string;
  content: string;
  contentType: string;
  status: string;
  externalId?: string;
  errorMessage?: string;
  personId?: string;
  createdAt: string;
}

export interface ChannelMessageListResponse {
  items: ChannelMessage[];
  nextCursor: string | null;
}

export interface CreateChannelConfigInput {
  name: string;
  provider: string;
  credentials: Record<string, any>;
  phoneNumber: string;
  isActive?: boolean;
}

export interface SendMessageInput {
  channelConfigId: string;
  personId: string;
  content: string;
  contentType?: string;
  mediaUrl?: string;
}

export const channelConfigsApi = {
  list: () =>
    http.get<ChannelConfig[]>('/channel-configs').then((r) => r.data),
  get: (id: string) =>
    http.get<ChannelConfig>(`/channel-configs/${id}`).then((r) => r.data),
  create: (data: CreateChannelConfigInput) =>
    http.post<ChannelConfig>('/channel-configs', data).then((r) => r.data),
  update: (id: string, data: Partial<CreateChannelConfigInput>) =>
    http.patch<ChannelConfig>(`/channel-configs/${id}`, data).then((r) => r.data),
};

export const channelMessagesApi = {
  list: (params?: Record<string, any>) =>
    http.get<ChannelMessageListResponse>('/channels/messages', { params }).then((r) => r.data),
  send: (data: SendMessageInput) =>
    http.post<ChannelMessage>('/channels/send', data).then((r) => r.data),
};

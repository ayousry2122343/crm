import { api } from './client';

export interface CopilotMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CopilotContext {
  entityType?: string;
  entityId?: string;
}

export interface CopilotResponse {
  reply: string;
  suggestedPrompts: string[];
}

export const copilotApi = {
  chat: (message: string, context?: CopilotContext, history?: CopilotMessage[]) =>
    api.post<CopilotResponse>('/ai/copilot/chat', { message, context, history }).then((r) => r.data),
};

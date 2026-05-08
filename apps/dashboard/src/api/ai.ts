import { api as http } from './client';

export interface AIComposeRequest {
  intent: string;
  language: 'ar' | 'en';
  recordRef?: { entityType: string; entityId: string };
  tone?: 'formal' | 'casual';
}

export interface AIComposeResponse {
  subject: string;
  body: string;
}

export const aiApi = {
  composeEmail: async (data: AIComposeRequest): Promise<AIComposeResponse> => {
    const r = await http.post('/ai/email-composer', data);
    return r.data;
  },
};

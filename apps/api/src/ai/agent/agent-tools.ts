export interface AgentToolDef {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string }>;
}

export const SERVICE_AGENT_TOOLS: AgentToolDef[] = [
  {
    name: 'searchKB',
    description: 'Search knowledge base articles for relevant answers',
    parameters: { query: { type: 'string', description: 'Search query' } },
  },
  {
    name: 'getTicketDetails',
    description: 'Get details of a specific ticket',
    parameters: { ticketId: { type: 'string', description: 'Ticket ID' } },
  },
  {
    name: 'getPersonProfile',
    description: 'Get customer profile information',
    parameters: { personId: { type: 'string', description: 'Person ID' } },
  },
  {
    name: 'escalateToHuman',
    description: 'Transfer conversation to a human agent when you cannot resolve the issue',
    parameters: { reason: { type: 'string', description: 'Reason for escalation' } },
  },
  {
    name: 'resolveTicket',
    description: 'Mark the ticket as resolved with a summary',
    parameters: { summary: { type: 'string', description: 'Resolution summary' } },
  },
  {
    name: 'suggestArticle',
    description: 'Send a knowledge base article link to the customer',
    parameters: { articleId: { type: 'string', description: 'KB Article ID' } },
  },
];

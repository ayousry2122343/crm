export interface CalendarEventData {
  externalId: string;
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  location?: string;
  attendees: Array<{ email: string; name?: string; status?: string }>;
  updatedAt: string;
}

export interface ICalendarProvider {
  getAuthUrl(redirectUri: string, state: string): string;
  exchangeCode(code: string, redirectUri: string): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }>;
  refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: Date }>;
  listEvents(accessToken: string, calendarId: string, syncToken?: string): Promise<{ events: CalendarEventData[]; nextSyncToken?: string }>;
  createEvent(accessToken: string, calendarId: string, event: Omit<CalendarEventData, 'externalId' | 'updatedAt'>): Promise<CalendarEventData>;
  updateEvent(accessToken: string, calendarId: string, externalId: string, event: Partial<CalendarEventData>): Promise<CalendarEventData>;
  deleteEvent(accessToken: string, calendarId: string, externalId: string): Promise<void>;
}

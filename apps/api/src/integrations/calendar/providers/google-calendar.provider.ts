import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ICalendarProvider, CalendarEventData } from '../calendar-provider.interface';

@Injectable()
export class GoogleCalendarProvider implements ICalendarProvider {
  constructor(private readonly config: ConfigService) {}

  getAuthUrl(redirectUri: string, state: string): string {
    const clientId = this.config.get('GOOGLE_CLIENT_ID', '');
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=https://www.googleapis.com/auth/calendar&access_type=offline&state=${state}`;
  }

  async exchangeCode(code: string, redirectUri: string) {
    const clientId = this.config.get('GOOGLE_CLIENT_ID', '');
    const clientSecret = this.config.get('GOOGLE_CLIENT_SECRET', '');

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async refreshAccessToken(refreshToken: string) {
    const clientId = this.config.get('GOOGLE_CLIENT_ID', '');
    const clientSecret = this.config.get('GOOGLE_CLIENT_SECRET', '');

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
      }),
    });
    const data = await res.json();
    return {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async listEvents(accessToken: string, calendarId: string, syncToken?: string) {
    const params = new URLSearchParams({ maxResults: '100' });
    if (syncToken) params.set('syncToken', syncToken);
    else params.set('timeMin', new Date().toISOString());

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const data = await res.json();
    const events: CalendarEventData[] = (data.items ?? []).map((item: any) => ({
      externalId: item.id,
      title: item.summary ?? '',
      description: item.description,
      startAt: item.start?.dateTime ?? item.start?.date,
      endAt: item.end?.dateTime ?? item.end?.date,
      location: item.location,
      attendees: (item.attendees ?? []).map((a: any) => ({
        email: a.email,
        name: a.displayName,
        status: a.responseStatus,
      })),
      updatedAt: item.updated,
    }));
    return { events, nextSyncToken: data.nextSyncToken };
  }

  async createEvent(accessToken: string, calendarId: string, event: Omit<CalendarEventData, 'externalId' | 'updatedAt'>) {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: event.title,
          description: event.description,
          start: { dateTime: event.startAt },
          end: { dateTime: event.endAt },
          location: event.location,
          attendees: event.attendees?.map((a) => ({ email: a.email })),
        }),
      },
    );
    const data = await res.json();
    return {
      externalId: data.id,
      title: data.summary,
      startAt: data.start?.dateTime,
      endAt: data.end?.dateTime,
      attendees: [],
      updatedAt: data.updated,
    };
  }

  async updateEvent(accessToken: string, calendarId: string, externalId: string, event: Partial<CalendarEventData>) {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${externalId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: event.title,
          description: event.description,
          start: event.startAt ? { dateTime: event.startAt } : undefined,
          end: event.endAt ? { dateTime: event.endAt } : undefined,
        }),
      },
    );
    const data = await res.json();
    return {
      externalId: data.id,
      title: data.summary,
      startAt: data.start?.dateTime,
      endAt: data.end?.dateTime,
      attendees: [],
      updatedAt: data.updated,
    };
  }

  async deleteEvent(accessToken: string, calendarId: string, externalId: string) {
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${externalId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
  }
}

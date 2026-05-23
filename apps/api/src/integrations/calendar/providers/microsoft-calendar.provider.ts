import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ICalendarProvider, CalendarEventData } from '../calendar-provider.interface';

@Injectable()
export class MicrosoftCalendarProvider implements ICalendarProvider {
  constructor(private readonly config: ConfigService) {}

  getAuthUrl(redirectUri: string, state: string): string {
    const clientId = this.config.get('MICROSOFT_CLIENT_ID', '');
    const tenantId = this.config.get('MICROSOFT_TENANT_ID', 'common');
    return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=Calendars.ReadWrite offline_access&state=${state}`;
  }

  async exchangeCode(code: string, redirectUri: string) {
    const clientId = this.config.get('MICROSOFT_CLIENT_ID', '');
    const clientSecret = this.config.get('MICROSOFT_CLIENT_SECRET', '');
    const tenantId = this.config.get('MICROSOFT_TENANT_ID', 'common');

    const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        scope: 'Calendars.ReadWrite offline_access',
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
    const clientId = this.config.get('MICROSOFT_CLIENT_ID', '');
    const clientSecret = this.config.get('MICROSOFT_CLIENT_SECRET', '');
    const tenantId = this.config.get('MICROSOFT_TENANT_ID', 'common');

    const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        scope: 'Calendars.ReadWrite offline_access',
      }),
    });
    const data = await res.json();
    return {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async listEvents(accessToken: string, calendarId: string, _syncToken?: string) {
    const timeMin = new Date().toISOString();
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events?$filter=start/dateTime ge '${timeMin}'&$top=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const data = await res.json();
    const events: CalendarEventData[] = (data.value ?? []).map((item: any) => ({
      externalId: item.id,
      title: item.subject ?? '',
      description: item.bodyPreview,
      startAt: item.start?.dateTime,
      endAt: item.end?.dateTime,
      location: item.location?.displayName,
      attendees: (item.attendees ?? []).map((a: any) => ({
        email: a.emailAddress?.address,
        name: a.emailAddress?.name,
        status: a.status?.response,
      })),
      updatedAt: item.lastModifiedDateTime,
    }));
    return { events, nextSyncToken: data['@odata.deltaLink'] };
  }

  async createEvent(accessToken: string, calendarId: string, event: Omit<CalendarEventData, 'externalId' | 'updatedAt'>) {
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: event.title,
          body: { contentType: 'text', content: event.description ?? '' },
          start: { dateTime: event.startAt, timeZone: 'UTC' },
          end: { dateTime: event.endAt, timeZone: 'UTC' },
          location: event.location ? { displayName: event.location } : undefined,
          attendees: event.attendees?.map((a) => ({
            emailAddress: { address: a.email, name: a.name },
            type: 'required',
          })),
        }),
      },
    );
    const data = await res.json();
    return {
      externalId: data.id,
      title: data.subject,
      startAt: data.start?.dateTime,
      endAt: data.end?.dateTime,
      attendees: [],
      updatedAt: data.lastModifiedDateTime,
    };
  }

  async updateEvent(accessToken: string, calendarId: string, externalId: string, event: Partial<CalendarEventData>) {
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events/${externalId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: event.title,
          start: event.startAt ? { dateTime: event.startAt, timeZone: 'UTC' } : undefined,
          end: event.endAt ? { dateTime: event.endAt, timeZone: 'UTC' } : undefined,
        }),
      },
    );
    const data = await res.json();
    return {
      externalId: data.id,
      title: data.subject,
      startAt: data.start?.dateTime,
      endAt: data.end?.dateTime,
      attendees: [],
      updatedAt: data.lastModifiedDateTime,
    };
  }

  async deleteEvent(accessToken: string, calendarId: string, externalId: string) {
    await fetch(
      `https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events/${externalId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
  }
}

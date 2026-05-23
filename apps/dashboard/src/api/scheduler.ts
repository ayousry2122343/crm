import { api as http } from './client';

export interface BookingPage {
  id: string;
  slug: string;
  title: string;
  description?: string;
  duration: number;
  availability: Record<string, any>;
  timezone: string;
  bufferBefore: number;
  bufferAfter: number;
  maxPerDay?: number;
  isActive: boolean;
  createdAt: string;
}

export interface Booking {
  id: string;
  guestName: string;
  guestEmail: string;
  startAt: string;
  endAt: string;
  status: string;
  cancelToken: string;
}

export const bookingPagesApi = {
  list: () =>
    http.get<BookingPage[]>('/booking-pages').then((r) => r.data),
  create: (data: Partial<BookingPage>) =>
    http.post<BookingPage>('/booking-pages', data).then((r) => r.data),
};

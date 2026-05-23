import { Module } from '@nestjs/common';
import { CalendarSyncService } from './calendar-sync.service';
import { CalendarController } from './calendar.controller';
import { GoogleCalendarProvider } from './providers/google-calendar.provider';
import { MicrosoftCalendarProvider } from './providers/microsoft-calendar.provider';

@Module({
  providers: [GoogleCalendarProvider, MicrosoftCalendarProvider, CalendarSyncService],
  controllers: [CalendarController],
  exports: [CalendarSyncService],
})
export class CalendarModule {}

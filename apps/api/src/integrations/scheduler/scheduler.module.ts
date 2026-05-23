import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { BookingPageController } from './booking-page.controller';

@Module({
  providers: [BookingService],
  controllers: [BookingController, BookingPageController],
  exports: [BookingService],
})
export class SchedulerModule {}

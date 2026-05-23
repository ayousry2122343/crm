import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Public } from '../../core/auth/jwt.guard';

@ApiTags('booking')
@Controller('book')
export class BookingController {
  constructor(private readonly svc: BookingService) {}

  @Public()
  @Get(':slug')
  getPage(@Param('slug') slug: string) {
    return this.svc.getPageBySlug(slug);
  }

  @Public()
  @Get(':slug/slots')
  getSlots(@Param('slug') slug: string, @Query('date') date: string) {
    return this.svc.getAvailableSlots(slug, date);
  }

  @Public()
  @Post(':slug')
  book(@Param('slug') slug: string, @Body() dto: CreateBookingDto) {
    return this.svc.createBooking(slug, dto);
  }

  @Public()
  @Post(':slug/cancel/:token')
  cancel(@Param('token') token: string) {
    return this.svc.cancelBooking(token);
  }

  @Public()
  @Post(':slug/reschedule/:token')
  reschedule(
    @Param('token') token: string,
    @Body() body: { startAt: string },
  ) {
    return this.svc.rescheduleBooking(token, body.startAt);
  }
}

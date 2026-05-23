import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BookingService } from './booking.service';
import { CreateBookingPageDto } from './dto/create-booking-page.dto';
import { PermissionGuard } from '../../core/rbac/permission.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('booking-pages')
@UseGuards(PermissionGuard)
@Controller('booking-pages')
export class BookingPageController {
  constructor(private readonly svc: BookingService) {}

  @RequiresPermission(PERMISSIONS.BOOKING_READ)
  @Get()
  list() {
    return this.svc.listPages();
  }

  @RequiresPermission(PERMISSIONS.BOOKING_WRITE)
  @Post()
  create(@Body() dto: CreateBookingPageDto) {
    return this.svc.createPage(dto);
  }
}

import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  guestName: string;

  @IsString()
  guestEmail: string;

  @IsOptional()
  @IsString()
  guestPhone?: string;

  @IsDateString()
  startAt: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

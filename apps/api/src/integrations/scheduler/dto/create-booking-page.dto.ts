import { IsString, IsNumber, IsOptional, IsObject, IsArray } from 'class-validator';

export class CreateBookingPageDto {
  @IsString()
  slug: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  duration: number;

  @IsObject()
  availability: Record<string, any>;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsNumber()
  bufferBefore?: number;

  @IsOptional()
  @IsNumber()
  bufferAfter?: number;

  @IsOptional()
  @IsNumber()
  maxPerDay?: number;

  @IsOptional()
  @IsString()
  queueId?: string;

  @IsOptional()
  @IsArray()
  reminderMinutes?: number[];
}

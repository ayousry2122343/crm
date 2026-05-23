import { IsArray, IsBoolean, IsOptional, IsString, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class ScheduleEntry {
  @IsNumber() day: number;
  @IsString() startTime: string;
  @IsString() endTime: string;
}

class HolidayEntry {
  @IsString() date: string;
  @IsString() name: string;
}

export class CreateBusinessHoursDto {
  @IsString() name: string;
  @IsOptional() @IsString() timezone?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => ScheduleEntry) schedule: ScheduleEntry[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => HolidayEntry) holidays?: HolidayEntry[];
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

import { IsArray, IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ScheduleEntry {
  day: number;
  startTime: string;
  endTime: string;
}

class HolidayEntry {
  date: string;
  name: string;
}

export class UpdateBusinessHoursDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ScheduleEntry) schedule?: ScheduleEntry[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => HolidayEntry) holidays?: HolidayEntry[];
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

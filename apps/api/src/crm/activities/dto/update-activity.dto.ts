import { IsObject, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateActivityDto {
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsString() ownerId?: string;
  @IsOptional() @Type(() => Date) dueAt?: Date;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

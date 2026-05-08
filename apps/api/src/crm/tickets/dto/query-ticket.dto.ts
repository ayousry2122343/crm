import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryTicketDto {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @IsInt() @Min(1) @Max(200) @Type(() => Number) limit?: number;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsString() channel?: string;
  @IsOptional() @IsString() assigneeId?: string;
  @IsOptional() @IsString() contactId?: string;
  @IsOptional() @IsString() teamId?: string;
  @IsOptional() @IsString() search?: string;
}

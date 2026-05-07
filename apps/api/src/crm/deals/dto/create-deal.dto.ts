import { IsNumber, IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDealDto {
  @IsString() name: string;
  @IsString() pipelineId: string;
  @IsString() stageId: string;

  @IsOptional() @IsNumber() @Type(() => Number) amount?: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @Type(() => Date) expectedCloseDate?: Date;
  @IsOptional() @IsInt() @Min(0) @Max(100) @Type(() => Number) probability?: number;

  @IsOptional() @IsString() ownerId?: string;
  @IsOptional() @IsString() primaryContactId?: string;
  @IsOptional() @IsString() primaryCompanyId?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsObject() customFields?: Record<string, unknown>;
}

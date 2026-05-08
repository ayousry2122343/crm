import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateQueueDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(['MANUAL', 'ROUND_ROBIN', 'LEAST_ACTIVE']) assignmentMode?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) members?: string[];
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

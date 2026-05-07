import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateEmailTemplateDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) mergeTagKeys?: string[];
  @IsOptional() @IsString() category?: string;
}

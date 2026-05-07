import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateEmailTemplateDto {
  @IsString() name: string;
  @IsString() subject: string;
  @IsString() body: string;
  @IsOptional() @IsArray() @IsString({ each: true }) mergeTagKeys?: string[];
  @IsOptional() @IsString() category?: string;
}

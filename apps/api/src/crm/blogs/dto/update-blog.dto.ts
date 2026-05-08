import { IsString, IsOptional, IsArray } from 'class-validator';

export class UpdateBlogDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsString() metaDescription?: string;
  @IsOptional() @IsString() categoryId?: string;
}

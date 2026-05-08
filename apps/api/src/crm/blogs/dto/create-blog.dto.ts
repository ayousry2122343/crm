import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateBlogDto {
  @IsString() title: string;
  @IsString() slug: string;
  @IsString() body: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsString() metaDescription?: string;
  @IsOptional() @IsString() categoryId?: string;
}

import { IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @IsString() name: string;
  @IsOptional() @IsString() labelAr?: string;
  @IsOptional() @IsString() labelEn?: string;
  @IsOptional() @IsString() parentId?: string;
}

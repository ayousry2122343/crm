import { IsBoolean, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString() name: string;

  @IsOptional() @IsString() labelAr?: string;
  @IsOptional() @IsString() labelEn?: string;
  @IsOptional() @IsString() sku?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() @Type(() => Number) unitPrice?: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsObject() customFields?: Record<string, unknown>;
}

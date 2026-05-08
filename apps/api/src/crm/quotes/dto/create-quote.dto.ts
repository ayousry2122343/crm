import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LineItemDto {
  @IsOptional() @IsString() productId?: string;
  @IsString() description: string;
  @IsInt() @Min(1) @Type(() => Number) quantity: number;
  @IsNumber() @Type(() => Number) unitPrice: number;
  @IsOptional() @IsNumber() @Type(() => Number) discountPct?: number;
}

export class CreateQuoteDto {
  @IsOptional() @IsString() dealId?: string;
  @IsOptional() @IsString() contactId?: string;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @Type(() => Date) validUntil?: Date;
  @IsOptional() @IsNumber() @Type(() => Number) discountPct?: number;
  @IsOptional() @IsNumber() @Type(() => Number) taxPct?: number;
  @IsOptional() @IsString() notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineItemDto)
  lineItems: LineItemDto[];
}

import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { LineItemDto } from './create-quote.dto';

export class UpdateQuoteDto {
  @IsOptional() @IsString() contactId?: string;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @Type(() => Date) validUntil?: Date;
  @IsOptional() @IsNumber() @Type(() => Number) discountPct?: number;
  @IsOptional() @IsNumber() @Type(() => Number) taxPct?: number;
  @IsOptional() @IsString() notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineItemDto)
  lineItems?: LineItemDto[];
}

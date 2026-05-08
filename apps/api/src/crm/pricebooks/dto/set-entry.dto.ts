import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SetEntryDto {
  @IsString() productId: string;
  @IsNumber() @Type(() => Number) unitPrice: number;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) minQty?: number;
}

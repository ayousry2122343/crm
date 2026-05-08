import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdatePricebookDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

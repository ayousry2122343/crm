import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreatePricebookDto {
  @IsString() name: string;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

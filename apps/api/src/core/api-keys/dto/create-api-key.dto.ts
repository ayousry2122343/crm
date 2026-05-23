import { IsString, IsOptional, IsArray, IsDateString, MinLength } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsArray()
  @IsString({ each: true })
  scopes: string[];

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

import { IsBoolean, IsObject, IsOptional } from 'class-validator';

export class UpdateValidationRuleDto {
  @IsOptional() @IsObject() expression?: Record<string, unknown>;
  @IsOptional() @IsObject() errorMessage?: Record<string, string>;
  @IsOptional() @IsBoolean() enabled?: boolean;
}

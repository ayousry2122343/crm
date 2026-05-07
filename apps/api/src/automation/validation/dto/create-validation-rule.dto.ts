import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateValidationRuleDto {
  @IsString() entityType: string;
  @IsObject() expression: Record<string, unknown>;
  @IsObject() errorMessage: Record<string, string>;
  @IsOptional() @IsBoolean() enabled?: boolean;
}

import { IsArray, IsEnum, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RuleItemDto {
  @IsString() field: string;
  @IsString() operator: string;
  value: any;
  @IsInt() @Type(() => Number) points: number;
}

export class CreateScoringRuleDto {
  @IsString() name: string;
  @IsEnum(['PERSON', 'DEAL']) entityType: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => RuleItemDto) rules: RuleItemDto[];
  @IsOptional() @IsInt() @Type(() => Number) maxScore?: number;
}

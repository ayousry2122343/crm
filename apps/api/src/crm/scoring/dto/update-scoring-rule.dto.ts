import { IsArray, IsBoolean, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RuleItemDto } from './create-scoring-rule.dto';

export class UpdateScoringRuleDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => RuleItemDto) rules?: RuleItemDto[];
  @IsOptional() @IsInt() @Type(() => Number) maxScore?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

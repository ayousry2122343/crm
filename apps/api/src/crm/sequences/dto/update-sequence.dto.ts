import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';
import type { SequenceStepDto } from './create-sequence.dto';

export class UpdateSequenceDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() triggerEvent?: string;
  @IsOptional() @IsArray() steps?: SequenceStepDto[];
  @IsOptional() @IsBoolean() enabled?: boolean;
}

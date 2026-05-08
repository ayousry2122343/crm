import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class SequenceStepDto {
  @IsString() action: string;
  @IsOptional() @IsString() templateId?: string;
  delay: number;
  @IsString() delayUnit: string;
  conditions?: Record<string, unknown>;
}

export class CreateSequenceDto {
  @IsString() name: string;
  @IsOptional() @IsString() triggerEvent?: string;
  @IsOptional() @IsArray() steps?: SequenceStepDto[];
  @IsOptional() @IsBoolean() enabled?: boolean;
}

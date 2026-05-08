import { IsEnum, IsOptional, IsString } from 'class-validator';

export class GenerateForecastDto {
  @IsEnum(['MONTHLY', 'QUARTERLY']) periodType: string;
  @IsString() date: string;
  @IsOptional() @IsString() pipelineId?: string;
}

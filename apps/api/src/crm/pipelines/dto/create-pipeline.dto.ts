import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreatePipelineDto {
  @IsString() name: string;
  @IsOptional() @IsString() entityType?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

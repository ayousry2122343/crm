import { IsArray, IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateWorkflowDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsObject() trigger?: Record<string, unknown>;
  @IsOptional() @IsObject() conditions?: Record<string, unknown>;
  @IsOptional() @IsArray() actions?: Record<string, unknown>[];
}

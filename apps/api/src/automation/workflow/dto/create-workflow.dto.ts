import { IsArray, IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateWorkflowDto {
  @IsString() name: string;
  @IsString() entityType: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsObject() trigger: Record<string, unknown>;
  @IsObject() conditions: Record<string, unknown>;
  @IsArray() actions: Record<string, unknown>[];
}

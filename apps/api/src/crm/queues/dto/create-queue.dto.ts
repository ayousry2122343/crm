import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateQueueDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(['MANUAL', 'ROUND_ROBIN', 'LEAST_ACTIVE']) assignmentMode?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) members?: string[];
}

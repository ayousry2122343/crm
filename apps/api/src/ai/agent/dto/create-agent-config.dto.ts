import { IsString, IsBoolean, IsNumber, IsArray, IsOptional } from 'class-validator';

export class CreateAgentConfigDto {
  @IsString()
  name: string;

  @IsString()
  type: string;

  @IsString()
  provider: string;

  @IsString()
  model: string;

  @IsString()
  systemPrompt: string;

  @IsArray()
  tools: string[];

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsArray()
  @IsString({ each: true })
  queueIds: string[];

  @IsOptional()
  @IsNumber()
  maxTurnsBeforeEscalation?: number;

  @IsOptional()
  @IsNumber()
  confidenceThreshold?: number;

  @IsOptional()
  @IsString()
  responseLanguage?: string;
}

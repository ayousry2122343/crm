import { IsString, IsOptional, IsEnum } from 'class-validator';
import { MacroVisibility } from '@prisma/client';

export class CreateMacroDto {
  @IsString()
  name: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  shortcut?: string;

  @IsOptional()
  @IsEnum(MacroVisibility)
  visibility?: MacroVisibility;
}

import { IsOptional, IsString } from 'class-validator';

export class QueryMacroDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  visibility?: string;
}

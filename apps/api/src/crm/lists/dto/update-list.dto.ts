import { IsBoolean, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateListDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() isShared?: boolean;
  @IsOptional() @IsObject() query?: Record<string, unknown>;
}

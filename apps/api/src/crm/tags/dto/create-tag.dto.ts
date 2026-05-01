import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateTagDto {
  @IsString() @MinLength(1) @MaxLength(80) name!: string;

  @IsOptional()
  @IsString()
  @Matches(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, { message: 'color must be a hex like #6366f1' })
  color?: string;
}

export class UpdateTagDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80) name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, { message: 'color must be a hex like #6366f1' })
  color?: string;
}

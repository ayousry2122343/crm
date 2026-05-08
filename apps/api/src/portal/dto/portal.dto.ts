import { IsString, IsOptional, IsBoolean, IsObject, IsEmail, MinLength } from 'class-validator';

export class UpdatePortalDto {
  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsObject()
  theme?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class PortalRegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

export class PortalLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

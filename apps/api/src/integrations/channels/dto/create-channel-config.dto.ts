import { IsString, IsObject, IsOptional, IsBoolean } from 'class-validator';

export class CreateChannelConfigDto {
  @IsString()
  name: string;

  @IsString()
  provider: string;

  @IsObject()
  credentials: Record<string, any>;

  @IsString()
  phoneNumber: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateChannelConfigDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsObject()
  credentials?: Record<string, any>;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

import { IsString, IsEnum, IsOptional } from 'class-validator';

export enum EmailProviderDto {
  GMAIL = 'GMAIL',
  OUTLOOK = 'OUTLOOK',
}

export class ConnectAccountDto {
  @IsEnum(EmailProviderDto)
  provider: EmailProviderDto;

  @IsString()
  emailAddress: string;

  @IsString()
  accessToken: string;

  @IsString()
  @IsOptional()
  refreshToken?: string;
}

import { IsString, IsOptional } from 'class-validator';

export class CreateCalendarAccountDto {
  @IsString()
  provider: string;

  @IsString()
  code: string;

  @IsString()
  redirectUri: string;

  @IsString()
  calendarId: string;

  @IsString()
  emailAddress: string;

  @IsOptional()
  @IsString()
  syncDirection?: string;
}

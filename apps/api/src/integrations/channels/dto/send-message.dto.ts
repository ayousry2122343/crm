import { IsString, IsOptional } from 'class-validator';

export class SendMessageDto {
  @IsString()
  channelConfigId: string;

  @IsString()
  personId: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  contentType?: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;
}

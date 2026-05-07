import { IsArray, IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateWebhookDto {
  @IsUrl() url: string;
  @IsString() secret: string;
  @IsArray() @IsString({ each: true }) events: string[];
  @IsOptional() @IsBoolean() enabled?: boolean;
}

import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateTicketDto {
  @IsString() subject: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']) priority?: string;
  @IsOptional() @IsEnum(['EMAIL', 'PHONE', 'CHAT', 'WEB_FORM', 'PORTAL', 'API']) channel?: string;
  @IsOptional() @IsString() contactId?: string;
  @IsOptional() @IsString() companyId?: string;
  @IsOptional() @IsString() assigneeId?: string;
  @IsOptional() @IsString() teamId?: string;
  @IsOptional() tags?: any;
  @IsOptional() customFields?: any;
}

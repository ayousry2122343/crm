import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

const STAGES = ['LEAD', 'MQL', 'SQL', 'OPP', 'CUSTOMER', 'EVANGELIST'] as const;

export class CreatePersonDto {
  @IsOptional() @IsBoolean() isCompany?: boolean;
  @IsOptional() @IsString() parentId?: string;

  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() companyName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() industry?: string;
  @IsOptional() @IsString() website?: string;
  @IsOptional() @IsObject() address?: Record<string, unknown>;

  @IsOptional() @IsIn(STAGES) lifecycleStage?: (typeof STAGES)[number];
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() ownerId?: string;

  @IsOptional() @IsObject() customFields?: Record<string, unknown>;
  @IsOptional() @IsBoolean() doNotContact?: boolean;
}

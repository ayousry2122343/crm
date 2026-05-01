import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

const STAGES = ['LEAD', 'MQL', 'SQL', 'OPP', 'CUSTOMER', 'EVANGELIST'] as const;

export class UpdatePersonDto {
  @IsOptional() @IsBoolean() isCompany?: boolean;
  @IsOptional() @IsString() parentId?: string | null;

  @IsOptional() @IsString() firstName?: string | null;
  @IsOptional() @IsString() lastName?: string | null;
  @IsOptional() @IsString() companyName?: string | null;
  @IsOptional() @IsEmail() email?: string | null;
  @IsOptional() @IsString() phone?: string | null;
  @IsOptional() @IsString() title?: string | null;
  @IsOptional() @IsString() industry?: string | null;
  @IsOptional() @IsString() website?: string | null;
  @IsOptional() @IsObject() address?: Record<string, unknown> | null;

  @IsOptional() @IsIn(STAGES) lifecycleStage?: (typeof STAGES)[number];
  @IsOptional() @IsString() source?: string | null;
  @IsOptional() @IsString() ownerId?: string | null;

  @IsOptional() @IsObject() customFields?: Record<string, unknown>;
  @IsOptional() @IsBoolean() doNotContact?: boolean;
}

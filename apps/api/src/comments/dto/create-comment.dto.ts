import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCommentDto {
  @IsEnum(['PERSON', 'COMPANY', 'DEAL', 'ACTIVITY', 'TICKET', 'BLOG'])
  entityType!: string;

  @IsString()
  @IsNotEmpty()
  entityId!: string;

  @IsString()
  @IsNotEmpty()
  body!: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}

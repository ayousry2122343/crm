import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ArticleStatus } from '@prisma/client';

export class CreateKBArticleDto {
  @IsString()
  title: string;

  @IsString()
  slug: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;
}

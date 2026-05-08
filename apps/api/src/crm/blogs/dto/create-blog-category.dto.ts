import { IsString } from 'class-validator';

export class CreateBlogCategoryDto {
  @IsString() name: string;
}

import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateCommentBodyDto {
  @IsString()
  @IsNotEmpty()
  body!: string;
}

import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail() email!: string;
  @IsString() password!: string;
  @IsString() @MinLength(2) workspaceSlug!: string;
}

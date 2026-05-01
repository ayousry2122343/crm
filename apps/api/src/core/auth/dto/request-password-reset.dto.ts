import { IsEmail, IsString } from 'class-validator';

export class RequestPasswordResetDto {
  @IsString() workspaceSlug!: string;
  @IsEmail() email!: string;
}

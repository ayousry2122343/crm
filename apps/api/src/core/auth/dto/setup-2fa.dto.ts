import { IsString, Length } from 'class-validator';

export class Confirm2FADto {
  @IsString()
  @Length(6, 6)
  code: string;
}

export class Verify2FADto {
  @IsString()
  tempToken: string;

  @IsString()
  @Length(6, 8)
  code: string;
}

export class Disable2FADto {
  @IsString()
  @Length(6, 8)
  code: string;
}

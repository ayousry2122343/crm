import { IsOptional, IsString } from 'class-validator';

export class MoveDealDto {
  @IsString() stageId: string;
  @IsOptional() @IsString() wonReason?: string;
  @IsOptional() @IsString() lostReason?: string;
}

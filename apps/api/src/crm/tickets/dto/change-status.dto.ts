import { IsEnum } from 'class-validator';

export class ChangeStatusDto {
  @IsEnum(['NEW', 'OPEN', 'PENDING', 'ON_HOLD', 'RESOLVED', 'CLOSED'])
  status: string;
}

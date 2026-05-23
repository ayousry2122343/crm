import { IsString } from 'class-validator';

export class CreateCSATDto {
  @IsString()
  ticketId: string;
}

import { IsString, IsOptional } from 'class-validator';

export class ReplyConversationDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  contentType?: string;
}

export class AssignConversationDto {
  @IsString()
  assigneeId: string;
}

export class SnoozeConversationDto {
  @IsString()
  until: string;
}

export class MergeConversationDto {
  @IsString({ each: true })
  sourceIds: string[];
}

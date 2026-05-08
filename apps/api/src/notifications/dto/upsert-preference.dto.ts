import { IsBoolean, IsEnum } from 'class-validator';

export class UpsertPreferenceDto {
  @IsEnum(['IN_APP', 'EMAIL'])
  channel!: string;

  @IsEnum([
    'ASSIGNMENT',
    'MENTION',
    'DEAL_WON',
    'DEAL_LOST',
    'TASK_DUE',
    'TICKET_CREATED',
    'SLA_BREACH',
    'WORKFLOW',
    'SYSTEM',
  ])
  type!: string;

  @IsBoolean()
  enabled!: boolean;
}

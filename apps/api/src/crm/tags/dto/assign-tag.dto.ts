import { ArrayMinSize, IsArray, IsIn, IsString } from 'class-validator';

const ENTITY_TYPES = ['Person', 'Company', 'Deal', 'Activity'] as const;

export class AssignTagDto {
  @IsIn(ENTITY_TYPES) entityType!: (typeof ENTITY_TYPES)[number];
  @IsArray() @ArrayMinSize(1) @IsString({ each: true }) entityIds!: string[];
}

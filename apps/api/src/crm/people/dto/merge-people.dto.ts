import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class MergePeopleDto {
  @IsString() primaryId!: string;
  @IsArray() @ArrayMinSize(1) @IsString({ each: true }) mergedIds!: string[];
}

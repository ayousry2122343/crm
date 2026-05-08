import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class QueryProductDto {
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @IsInt() @Min(1) @Max(200) @Type(() => Number) limit?: number;
  @IsOptional() @IsString() sort?: string;
}

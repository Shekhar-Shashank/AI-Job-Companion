import {
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSkillDto {
  @ApiProperty({ example: 'TypeScript' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 4, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  proficiencyLevel: number;

  @ApiPropertyOptional({ example: 3.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  yearsOfExperience?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ example: 'Programming Languages' })
  @IsOptional()
  @IsString()
  categoryName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;
}

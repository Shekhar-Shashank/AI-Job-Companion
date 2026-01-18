import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsInt,
  IsArray,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePlanItemDto {
  @ApiProperty({ example: 'Complete TypeScript course chapter 5' })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ example: 'Focus on generics and utility types' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '2024-01-15' })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @IsString()
  scheduledTime?: string;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationMinutes?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional({ example: ['typescript', 'learning'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}

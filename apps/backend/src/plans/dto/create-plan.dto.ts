import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  ValidateNested,
  IsIn,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CreatePlanItemDto } from './create-plan-item.dto';

export class CreatePlanDto {
  @ApiProperty({ example: 'daily' })
  @IsIn(['daily', 'weekly', 'monthly', 'study', 'workout', 'career'])
  planType: string;

  @ApiProperty({ example: 'January Week 1 Plan' })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ example: 'Focus on backend development' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-01-07' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePlanItemDto)
  items?: CreatePlanItemDto[];
}

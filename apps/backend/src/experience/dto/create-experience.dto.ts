import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsArray,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExperienceDto {
  @ApiProperty({ example: 'Google' })
  @IsString()
  @MaxLength(255)
  company: string;

  @ApiProperty({ example: 'Senior Software Engineer' })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ example: 'San Francisco, CA' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({ example: 'full-time' })
  @IsOptional()
  @IsString()
  employmentType?: string;

  @ApiProperty({ example: '2020-01-01' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ example: '2023-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;

  @ApiPropertyOptional({
    example: 'Led a team of 5 engineers to build a distributed system.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: ['Improved system performance by 40%', 'Led migration to microservices'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  achievements?: string[];

  @ApiPropertyOptional({
    example: ['TypeScript', 'Node.js', 'PostgreSQL', 'Kubernetes'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  technologies?: string[];
}

import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEducationDto {
  @ApiProperty({ example: 'Stanford University' })
  @IsString()
  @MaxLength(255)
  institution: string;

  @ApiProperty({ example: 'Bachelor of Science' })
  @IsString()
  @MaxLength(255)
  degree: string;

  @ApiPropertyOptional({ example: 'Computer Science' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fieldOfStudy?: string;

  @ApiPropertyOptional({ example: '2016-09-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2020-05-15' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: '3.8 GPA' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  grade?: string;

  @ApiPropertyOptional({ example: 'Graduated with honors. Focus on AI/ML.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;
}

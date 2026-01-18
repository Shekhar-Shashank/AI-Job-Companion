import {
  IsString,
  IsOptional,
  IsDateString,
  IsIn,
  IsArray,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class InterviewDto {
  @IsString()
  round: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  result?: string;
}

export class CreateApplicationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jobId?: string;

  @ApiPropertyOptional({ example: 'https://company.com/jobs/123' })
  @IsOptional()
  @IsUrl()
  externalJobUrl?: string;

  @ApiPropertyOptional({ example: 'Google' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ example: 'Senior Software Engineer' })
  @IsOptional()
  @IsString()
  jobTitle?: string;

  @ApiPropertyOptional({ example: 'applied' })
  @IsOptional()
  @IsIn(['saved', 'applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn'])
  status?: string;

  @ApiPropertyOptional({ example: '2024-01-15' })
  @IsOptional()
  @IsDateString()
  appliedDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverLetter?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nextAction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  nextActionDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InterviewDto)
  interviews?: InterviewDto[];
}

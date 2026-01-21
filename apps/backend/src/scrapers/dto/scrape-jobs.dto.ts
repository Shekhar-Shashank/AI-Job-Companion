import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ScrapeJobsDto {
  @ApiPropertyOptional({
    description: 'Specific sources to scrape (if empty, scrapes all enabled)',
    example: ['indeed', 'linkedin', 'naukri'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sources?: string[];

  @ApiPropertyOptional({
    description: 'Override keywords for search (uses profile keywords if empty)',
    example: ['software engineer', 'react developer'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({
    description: 'Override location for search',
    example: 'Bangalore',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: 'Filter for remote jobs only',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  remoteOnly?: boolean;

  @ApiPropertyOptional({
    description: 'Minimum salary filter',
    example: 1000000,
  })
  @IsOptional()
  @IsNumber()
  salaryMin?: number;

  @ApiPropertyOptional({
    description: 'Score jobs after scraping',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  scoreAfterScrape?: boolean;
}

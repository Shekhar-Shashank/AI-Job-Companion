import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScraperStatusDto {
  @ApiProperty({ description: 'Source identifier', example: 'indeed' })
  source: string;

  @ApiProperty({ description: 'Whether the scraper is enabled', example: true })
  enabled: boolean;

  @ApiProperty({ description: 'Whether the source is currently blocked', example: false })
  isBlocked: boolean;

  @ApiPropertyOptional({ description: 'When the source was blocked' })
  blockedAt?: Date;

  @ApiProperty({ description: 'Number of consecutive failures', example: 0 })
  consecutiveFailures: number;

  @ApiPropertyOptional({ description: 'Last successful scrape time' })
  lastSuccess?: Date;

  @ApiPropertyOptional({ description: 'Last scrape attempt time' })
  lastRun?: Date;
}

export class ScraperRunResultDto {
  @ApiProperty({ description: 'Source that was scraped', example: 'indeed' })
  source: string;

  @ApiProperty({ description: 'Whether the scrape was successful', example: true })
  success: boolean;

  @ApiProperty({ description: 'Number of jobs found', example: 25 })
  jobsFound: number;

  @ApiProperty({ description: 'Number of new jobs added', example: 20 })
  jobsNew: number;

  @ApiProperty({ description: 'Number of existing jobs updated', example: 5 })
  jobsUpdated: number;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  error?: string;

  @ApiProperty({ description: 'Whether the source was blocked', example: false })
  blocked?: boolean;

  @ApiPropertyOptional({ description: 'Duration of the scrape in ms' })
  duration?: number;
}

export class ScrapeResultDto {
  @ApiProperty({ description: 'Results for each source', type: [ScraperRunResultDto] })
  results: ScraperRunResultDto[];

  @ApiProperty({ description: 'Total new jobs found', example: 100 })
  totalJobsNew: number;

  @ApiProperty({ description: 'Total jobs updated', example: 25 })
  totalJobsUpdated: number;

  @ApiProperty({ description: 'Number of sources that succeeded', example: 5 })
  sourcesSucceeded: number;

  @ApiProperty({ description: 'Number of sources that failed', example: 2 })
  sourcesFailed: number;
}

export class ScraperHistoryDto {
  @ApiProperty({ description: 'Scraper run ID' })
  id: string;

  @ApiProperty({ description: 'Source identifier' })
  source: string;

  @ApiProperty({ description: 'Run status', enum: ['running', 'success', 'failed'] })
  status: string;

  @ApiProperty({ description: 'When the run started' })
  startedAt: Date;

  @ApiPropertyOptional({ description: 'When the run completed' })
  completedAt?: Date;

  @ApiProperty({ description: 'Jobs found in this run' })
  jobsFound: number;

  @ApiProperty({ description: 'New jobs added' })
  jobsNew: number;

  @ApiProperty({ description: 'Jobs updated' })
  jobsUpdated: number;

  @ApiPropertyOptional({ description: 'Error message if any' })
  errorMessage?: string;
}

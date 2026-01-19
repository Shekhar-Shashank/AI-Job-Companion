import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ScrapersService } from './scrapers.service';
import { ScrapeJobsDto } from './dto/scrape-jobs.dto';
import {
  ScrapeResultDto,
  ScraperStatusDto,
  ScraperHistoryDto,
} from './dto/scraper-status.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('Scrapers')
@ApiBearerAuth()
@Controller('scrapers')
export class ScrapersController {
  constructor(private readonly scrapersService: ScrapersService) {}

  @Post('run')
  @ApiOperation({ summary: 'Run job scrapers to fetch new jobs' })
  @ApiResponse({
    status: 200,
    description: 'Scraper results',
    type: ScrapeResultDto,
  })
  async runScrapers(
    @CurrentUser() user: User,
    @Body() dto: ScrapeJobsDto,
  ): Promise<ScrapeResultDto> {
    const customConfig: any = {};

    if (dto.keywords?.length) {
      customConfig.keywords = dto.keywords;
    }
    if (dto.location) {
      customConfig.location = dto.location;
    }
    if (dto.remoteOnly !== undefined) {
      customConfig.remote = dto.remoteOnly;
    }
    if (dto.salaryMin) {
      customConfig.salaryMin = dto.salaryMin;
    }

    const { results, totalJobsNew, totalJobsUpdated } =
      await this.scrapersService.scrapeAll(user.id, dto.sources, customConfig);

    // Score new jobs if requested
    if (dto.scoreAfterScrape !== false && totalJobsNew > 0) {
      await this.scrapersService.scoreNewJobs(user.id, 50);
    }

    return {
      results,
      totalJobsNew,
      totalJobsUpdated,
      sourcesSucceeded: results.filter((r) => r.success).length,
      sourcesFailed: results.filter((r) => !r.success).length,
    };
  }

  @Post('run/:source')
  @ApiOperation({ summary: 'Run a specific scraper' })
  @ApiResponse({
    status: 200,
    description: 'Single scraper result',
  })
  async runSingleScraper(
    @CurrentUser() user: User,
    @Param('source') source: string,
    @Body() dto: ScrapeJobsDto,
  ): Promise<ScrapeResultDto> {
    const customConfig: any = {};

    if (dto.keywords?.length) {
      customConfig.keywords = dto.keywords;
    }
    if (dto.location) {
      customConfig.location = dto.location;
    }

    const { results, totalJobsNew, totalJobsUpdated } =
      await this.scrapersService.scrapeAll(user.id, [source], customConfig);

    // Score new jobs if requested
    if (dto.scoreAfterScrape !== false && totalJobsNew > 0) {
      await this.scrapersService.scoreNewJobs(user.id, 50);
    }

    return {
      results,
      totalJobsNew,
      totalJobsUpdated,
      sourcesSucceeded: results.filter((r) => r.success).length,
      sourcesFailed: results.filter((r) => !r.success).length,
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get status of all scrapers' })
  @ApiResponse({
    status: 200,
    description: 'List of scraper statuses',
    type: [ScraperStatusDto],
  })
  async getStatus(): Promise<ScraperStatusDto[]> {
    return this.scrapersService.getStatus();
  }

  @Get('sources')
  @ApiOperation({ summary: 'Get list of available sources' })
  @ApiResponse({
    status: 200,
    description: 'List of source names',
  })
  async getSources(): Promise<{ sources: string[] }> {
    return { sources: this.scrapersService.getAvailableSources() };
  }

  @Get('history')
  @ApiOperation({ summary: 'Get scraper run history' })
  @ApiResponse({
    status: 200,
    description: 'List of recent scraper runs',
    type: [ScraperHistoryDto],
  })
  async getHistory(
    @Query('limit') limit?: number,
  ): Promise<ScraperHistoryDto[]> {
    return this.scrapersService.getHistory(limit || 20);
  }

  @Post('test/:source')
  @ApiOperation({ summary: 'Test connection to a specific scraper' })
  @ApiResponse({
    status: 200,
    description: 'Connection test result',
  })
  async testScraper(
    @Param('source') source: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.scrapersService.testScraper(source);
  }

  @Post('enable/:source')
  @ApiOperation({ summary: 'Enable a scraper' })
  async enableScraper(
    @Param('source') source: string,
  ): Promise<{ success: boolean }> {
    const success = this.scrapersService.setSourceEnabled(source, true);
    return { success };
  }

  @Post('disable/:source')
  @ApiOperation({ summary: 'Disable a scraper' })
  async disableScraper(
    @Param('source') source: string,
  ): Promise<{ success: boolean }> {
    const success = this.scrapersService.setSourceEnabled(source, false);
    return { success };
  }

  @Post('unblock/:source')
  @ApiOperation({ summary: 'Unblock a blocked scraper' })
  async unblockScraper(
    @Param('source') source: string,
  ): Promise<{ success: boolean }> {
    const success = this.scrapersService.unblockSource(source);
    return { success };
  }

  @Post('score')
  @ApiOperation({ summary: 'Score unscored jobs for current user' })
  async scoreJobs(
    @CurrentUser() user: User,
    @Query('limit') limit?: number,
  ): Promise<{ scored: number }> {
    const scored = await this.scrapersService.scoreNewJobs(user.id, limit || 50);
    return { scored };
  }
}

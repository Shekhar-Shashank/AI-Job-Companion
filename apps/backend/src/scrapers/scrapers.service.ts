import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';
import { JobScoringService } from '../jobs/job-scoring.service';
import {
  IScraper,
  ScraperConfig,
  ScraperResult,
  SourceHealth,
  ScrapedJob,
} from './interfaces/scraper.interface';
import { IndeedScraper } from './portals/indeed.scraper';
import { NaukriScraper } from './portals/naukri.scraper';
import { LinkedInScraper } from './portals/linkedin.scraper';
import { WellfoundScraper } from './portals/wellfound.scraper';
import { FounditScraper } from './portals/foundit.scraper';
import { HiristScraper } from './portals/hirist.scraper';
import { CutshortScraper } from './portals/cutshort.scraper';

/**
 * Orchestrator service for managing all job scrapers
 * Handles scraper initialization, health tracking, and job processing
 */
@Injectable()
export class ScrapersService {
  private readonly logger = new Logger(ScrapersService.name);
  private scrapers: Map<string, IScraper> = new Map();
  private sourceHealth: Map<string, SourceHealth> = new Map();

  // Configuration
  private readonly maxConcurrency = 3; // Max parallel scrapers
  private readonly maxConsecutiveFailures = 3; // Block source after N failures
  private readonly blockDuration = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    private prisma: PrismaService,
    private jobsService: JobsService,
    private scoringService: JobScoringService,
  ) {
    this.initializeScrapers();
  }

  /**
   * Initialize all portal scrapers
   */
  private initializeScrapers(): void {
    const scraperInstances: IScraper[] = [
      new IndeedScraper(),
      new NaukriScraper(),
      new LinkedInScraper(),
      new WellfoundScraper(),
      new FounditScraper(),
      new HiristScraper(),
      new CutshortScraper(),
    ];

    for (const scraper of scraperInstances) {
      this.scrapers.set(scraper.name, scraper);
      this.sourceHealth.set(scraper.name, {
        source: scraper.name,
        enabled: scraper.enabled,
        isBlocked: false,
        consecutiveFailures: 0,
      });
    }

    this.logger.log(`Initialized ${this.scrapers.size} scrapers`);
  }

  /**
   * Build search configuration from user's profile
   */
  async buildSearchConfig(userId: string): Promise<ScraperConfig> {
    // Get user's job targets
    const jobTarget = await this.prisma.jobTarget.findUnique({
      where: { userId },
    });

    // Get user's skills
    const skills = await this.prisma.skill.findMany({
      where: { userId },
      select: { name: true },
    });

    // Get user's experience for years calculation
    const experiences = await this.prisma.experience.findMany({
      where: { userId },
      select: { startDate: true, endDate: true, isCurrent: true },
    });

    // Calculate total years of experience
    let totalMonths = 0;
    for (const exp of experiences) {
      const start = new Date(exp.startDate);
      const end = exp.isCurrent ? new Date() : exp.endDate ? new Date(exp.endDate) : new Date();
      totalMonths += (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    }
    const experienceYears = Math.round(totalMonths / 12);

    // Build keywords from target roles and skills
    const keywords: string[] = [];

    // Add target roles
    if (jobTarget?.targetRoles) {
      try {
        const roles = JSON.parse(jobTarget.targetRoles);
        if (Array.isArray(roles)) {
          keywords.push(...roles);
        }
      } catch (e) {
        // If not JSON, treat as comma-separated
        keywords.push(...jobTarget.targetRoles.split(',').map(r => r.trim()));
      }
    }

    // Add top skills as keywords
    const topSkills = skills.slice(0, 5).map(s => s.name);
    keywords.push(...topSkills);

    // Parse locations
    let locations: string[] = [];
    if (jobTarget?.preferredLocations) {
      try {
        locations = JSON.parse(jobTarget.preferredLocations);
      } catch (e) {
        locations = jobTarget.preferredLocations.split(',').map(l => l.trim());
      }
    }

    // Determine remote preference
    const remote = jobTarget?.remotePreference === 'remote' ||
                  jobTarget?.remotePreference === 'any';

    return {
      keywords: keywords.filter(k => k && k.trim()),
      location: locations[0],
      locations,
      remote,
      experienceYears,
      salaryMin: jobTarget?.minSalary || undefined,
      salaryCurrency: jobTarget?.salaryCurrency || 'INR',
    };
  }

  /**
   * Run all enabled scrapers (or specified sources)
   */
  async scrapeAll(
    userId: string,
    sources?: string[],
    customConfig?: Partial<ScraperConfig>,
  ): Promise<{
    results: ScraperResult[];
    totalJobsNew: number;
    totalJobsUpdated: number;
  }> {
    // Build config from user profile
    const baseConfig = await this.buildSearchConfig(userId);
    const config = { ...baseConfig, ...customConfig };

    // Validate we have search keywords
    if (!config.keywords.length) {
      this.logger.warn('No search keywords available, using default');
      config.keywords = ['software engineer'];
    }

    this.logger.log(`Starting scrape with config: ${JSON.stringify(config)}`);

    // Determine which scrapers to run
    const scrapersToRun: IScraper[] = [];

    if (sources && sources.length > 0) {
      // Run specific sources
      for (const source of sources) {
        const scraper = this.scrapers.get(source.toLowerCase());
        if (scraper && this.isSourceAvailable(source)) {
          scrapersToRun.push(scraper);
        } else {
          this.logger.warn(`Scraper ${source} not available`);
        }
      }
    } else {
      // Run all enabled scrapers
      for (const [name, scraper] of this.scrapers) {
        if (scraper.enabled && this.isSourceAvailable(name)) {
          scrapersToRun.push(scraper);
        }
      }
    }

    if (scrapersToRun.length === 0) {
      return { results: [], totalJobsNew: 0, totalJobsUpdated: 0 };
    }

    // Run scrapers with concurrency limit
    const results: ScraperResult[] = [];
    let totalJobsNew = 0;
    let totalJobsUpdated = 0;

    // Process in batches
    for (let i = 0; i < scrapersToRun.length; i += this.maxConcurrency) {
      const batch = scrapersToRun.slice(i, i + this.maxConcurrency);

      const batchResults = await Promise.all(
        batch.map(scraper => this.runScraper(scraper, config)),
      );

      for (const result of batchResults) {
        results.push(result);
        totalJobsNew += result.jobsNew;
        totalJobsUpdated += result.jobsUpdated;
      }
    }

    this.logger.log(
      `Scrape completed: ${totalJobsNew} new jobs, ${totalJobsUpdated} updated`,
    );

    return { results, totalJobsNew, totalJobsUpdated };
  }

  /**
   * Run a single scraper and process results
   */
  private async runScraper(
    scraper: IScraper,
    config: ScraperConfig,
  ): Promise<ScraperResult> {
    const startTime = Date.now();
    const source = scraper.name;

    // Create scraper run record
    const run = await this.prisma.scraperRun.create({
      data: {
        source,
        status: 'running',
        startedAt: new Date(),
      },
    });

    try {
      this.logger.log(`[${source}] Starting scrape...`);

      // Run scraper
      const jobs = await scraper.scrape(config);

      // Process jobs
      let jobsNew = 0;
      let jobsUpdated = 0;

      for (const job of jobs) {
        try {
          const result = await this.processJob(job);
          if (result.isNew) jobsNew++;
          else jobsUpdated++;
        } catch (e) {
          this.logger.warn(`[${source}] Failed to process job: ${e}`);
        }
      }

      const duration = Date.now() - startTime;

      // Update scraper run record
      await this.prisma.scraperRun.update({
        where: { id: run.id },
        data: {
          status: 'success',
          completedAt: new Date(),
          jobsFound: jobs.length,
          jobsNew,
          jobsUpdated,
        },
      });

      // Update health
      this.updateSourceHealth(source, true);

      this.logger.log(
        `[${source}] Completed: ${jobs.length} jobs (${jobsNew} new, ${jobsUpdated} updated) in ${duration}ms`,
      );

      return {
        source,
        success: true,
        jobsFound: jobs.length,
        jobsNew,
        jobsUpdated,
        duration,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const duration = Date.now() - startTime;

      // Update scraper run record
      await this.prisma.scraperRun.update({
        where: { id: run.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          errorMessage,
        },
      });

      // Update health
      const blocked = this.updateSourceHealth(source, false);

      this.logger.error(`[${source}] Failed: ${errorMessage}`);

      return {
        source,
        success: false,
        jobsFound: 0,
        jobsNew: 0,
        jobsUpdated: 0,
        error: errorMessage,
        blocked,
        duration,
      };
    }
  }

  /**
   * Process a scraped job (upsert to database)
   */
  private async processJob(job: ScrapedJob): Promise<{ isNew: boolean }> {
    // Check if job exists
    const existing = await this.prisma.job.findFirst({
      where: {
        source: job.source,
        externalId: job.externalId,
      },
    });

    // Prepare job data
    const jobData = {
      source: job.source,
      externalId: job.externalId,
      sourceUrl: job.sourceUrl,
      title: job.title,
      company: job.company,
      location: job.location,
      isRemote: job.isRemote,
      description: job.description,
      requirements: job.requirements,
      responsibilities: job.responsibilities,
      skillsRequired: job.skillsRequired,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      salaryCurrency: job.salaryCurrency,
      experienceMin: job.experienceMin,
      experienceMax: job.experienceMax,
      employmentType: job.employmentType,
      postedDate: job.postedDate,
      companyLogoUrl: job.companyLogoUrl,
      benefits: job.benefits,
      industry: job.industry,
      companySize: job.companySize,
    };

    // Upsert job
    await this.jobsService.upsertFromScraper(jobData);

    return { isNew: !existing };
  }

  /**
   * Score newly scraped jobs for a user
   */
  async scoreNewJobs(userId: string, limit: number = 50): Promise<number> {
    // Get unscored jobs for this user
    const unscoredJobs = await this.prisma.job.findMany({
      where: {
        scores: {
          none: { userId },
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    let scored = 0;
    for (const job of unscoredJobs) {
      try {
        await this.scoringService.scoreJob(userId, job);
        scored++;
      } catch (e) {
        this.logger.warn(`Failed to score job ${job.id}: ${e}`);
      }
    }

    return scored;
  }

  /**
   * Check if a source is available (not blocked)
   */
  private isSourceAvailable(source: string): boolean {
    const health = this.sourceHealth.get(source);
    if (!health) return false;

    if (health.isBlocked) {
      // Check if block period has passed
      if (health.blockedAt) {
        const blockedDuration = Date.now() - health.blockedAt.getTime();
        if (blockedDuration >= this.blockDuration) {
          // Unblock and allow retry
          health.isBlocked = false;
          health.blockedAt = undefined;
          health.consecutiveFailures = 0;
          return true;
        }
      }
      return false;
    }

    return health.enabled;
  }

  /**
   * Update source health based on scrape result
   */
  private updateSourceHealth(source: string, success: boolean): boolean {
    const health = this.sourceHealth.get(source);
    if (!health) return false;

    if (success) {
      health.consecutiveFailures = 0;
      health.lastSuccess = new Date();
      health.lastRun = new Date();
      health.isBlocked = false;
      health.blockedAt = undefined;
    } else {
      health.consecutiveFailures++;
      health.lastRun = new Date();

      if (health.consecutiveFailures >= this.maxConsecutiveFailures) {
        health.isBlocked = true;
        health.blockedAt = new Date();
        this.logger.warn(`[${source}] Blocked after ${health.consecutiveFailures} failures`);
        return true;
      }
    }

    return false;
  }

  /**
   * Get status of all scrapers
   */
  async getStatus(): Promise<SourceHealth[]> {
    const statuses: SourceHealth[] = [];

    for (const [name, health] of this.sourceHealth) {
      // Get last run from database
      const lastRun = await this.prisma.scraperRun.findFirst({
        where: { source: name },
        orderBy: { startedAt: 'desc' },
      });

      statuses.push({
        ...health,
        lastRun: lastRun?.startedAt || health.lastRun,
        lastSuccess: lastRun?.status === 'success' ? lastRun.completedAt || undefined : health.lastSuccess,
      });
    }

    return statuses;
  }

  /**
   * Get scraper run history
   */
  async getHistory(limit: number = 20): Promise<any[]> {
    return this.prisma.scraperRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Test connection for a specific scraper
   */
  async testScraper(source: string): Promise<{ success: boolean; message: string }> {
    const scraper = this.scrapers.get(source.toLowerCase());

    if (!scraper) {
      return { success: false, message: `Scraper '${source}' not found` };
    }

    try {
      const success = await scraper.testConnection();
      return {
        success,
        message: success ? 'Connection successful' : 'Connection failed',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  /**
   * Get available sources
   */
  getAvailableSources(): string[] {
    return Array.from(this.scrapers.keys());
  }

  /**
   * Enable/disable a source
   */
  setSourceEnabled(source: string, enabled: boolean): boolean {
    const health = this.sourceHealth.get(source);
    if (!health) return false;

    health.enabled = enabled;

    const scraper = this.scrapers.get(source);
    if (scraper) {
      (scraper as any).enabled = enabled;
    }

    return true;
  }

  /**
   * Manually unblock a source
   */
  unblockSource(source: string): boolean {
    const health = this.sourceHealth.get(source);
    if (!health) return false;

    health.isBlocked = false;
    health.blockedAt = undefined;
    health.consecutiveFailures = 0;

    return true;
  }
}

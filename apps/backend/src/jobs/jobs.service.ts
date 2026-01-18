import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { JobScoringService } from './job-scoring.service';

const JOBS_CACHE_TTL = 120000; // 2 minutes

export interface JobFilters {
  search?: string;
  skills?: string[];
  location?: string;
  remote?: boolean;
  minSalary?: number;
  source?: string[];
  page?: number;
  limit?: number;
  sortBy?: 'relevance' | 'date' | 'salary';
}

@Injectable()
export class JobsService {
  constructor(
    private prisma: PrismaService,
    private scoringService: JobScoringService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async findAll(filters: JobFilters, userId?: string) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { company: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    if (filters.location) {
      where.location = { contains: filters.location };
    }

    if (filters.remote !== undefined) {
      where.isRemote = filters.remote;
    }

    if (filters.minSalary) {
      where.salaryMax = { gte: filters.minSalary };
    }

    if (filters.source && filters.source.length > 0) {
      where.source = { in: filters.source };
    }

    const orderBy: any = {};
    switch (filters.sortBy) {
      case 'date':
        orderBy.postedDate = 'desc';
        break;
      case 'salary':
        orderBy.salaryMax = 'desc';
        break;
      default:
        orderBy.createdAt = 'desc';
    }

    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: userId ? {
          scores: {
            where: { userId },
            take: 1,
          },
        } : undefined,
      }),
      this.prisma.job.count({ where }),
    ]);

    // Transform jobs to include score data in a cleaner format
    const jobsWithScores = jobs.map((job: any) => {
      const score = job.scores?.[0];
      const { scores, ...jobData } = job;
      return {
        ...jobData,
        score: score ? {
          id: score.id,
          overallScore: score.overallScore,
          semanticScore: score.semanticScore,
          skillMatchScore: score.skillMatchScore,
          experienceScore: score.experienceMatchScore,
          salaryScore: score.salaryMatchScore,
          locationScore: score.locationMatchScore,
          breakdown: score.scoreBreakdown ? JSON.parse(score.scoreBreakdown) : null,
        } : null,
      };
    });

    return {
      data: jobsWithScores,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
    });
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return job;
  }

  async findRanked(userId: string, limit: number = 20) {
    const cacheKey = `ranked-jobs:${userId}:${limit}`;

    // Try to get from cache first
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const scores = await this.prisma.jobScore.findMany({
      where: { userId },
      orderBy: { overallScore: 'desc' },
      take: limit,
      include: { job: true },
    });

    const result = scores.map((score) => ({
      ...score.job,
      score: {
        overall: score.overallScore,
        semantic: score.semanticScore,
        skillMatch: score.skillMatchScore,
        experienceMatch: score.experienceMatchScore,
        salaryMatch: score.salaryMatchScore,
        locationMatch: score.locationMatchScore,
        matchedSkills: score.matchedSkills
          ? JSON.parse(score.matchedSkills)
          : [],
        missingSkills: score.missingSkills
          ? JSON.parse(score.missingSkills)
          : [],
        breakdown: score.scoreBreakdown
          ? JSON.parse(score.scoreBreakdown)
          : null,
      },
    }));

    // Cache the result
    await this.cacheManager.set(cacheKey, result, JOBS_CACHE_TTL);

    return result;
  }

  async scoreJobs(userId: string, jobIds?: string[]) {
    const jobs = jobIds
      ? await this.prisma.job.findMany({ where: { id: { in: jobIds } } })
      : await this.prisma.job.findMany({ take: 100 });

    const results = [];
    for (const job of jobs) {
      const score = await this.scoringService.scoreJob(userId, job);
      results.push({ jobId: job.id, ...score });
    }

    return results;
  }

  async create(data: any) {
    return this.prisma.job.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.job.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    // First delete any associated scores
    await this.prisma.jobScore.deleteMany({
      where: { jobId: id },
    });
    // Then delete the job
    return this.prisma.job.delete({
      where: { id },
    });
  }

  async upsertFromScraper(data: any) {
    return this.prisma.job.upsert({
      where: {
        source_externalId: {
          source: data.source,
          externalId: data.externalId,
        },
      },
      update: data,
      create: data,
    });
  }
}

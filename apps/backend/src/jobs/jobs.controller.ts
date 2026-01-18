import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, IsArray } from 'class-validator';
import { JobsService, JobFilters } from './jobs.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';

class CreateJobDto {
  @IsString()
  title: string;

  @IsString()
  company: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsBoolean()
  isRemote?: boolean;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  requirements?: string;

  @IsOptional()
  @IsString()
  skillsRequired?: string;

  @IsOptional()
  @IsNumber()
  salaryMin?: number;

  @IsOptional()
  @IsNumber()
  salaryMax?: number;

  @IsOptional()
  @IsString()
  salaryCurrency?: string;

  @IsOptional()
  @IsString()
  sourceUrl?: string;

  @IsOptional()
  @IsString()
  employmentType?: string;
}

class UpdateJobDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsBoolean()
  isRemote?: boolean;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  requirements?: string;

  @IsOptional()
  @IsString()
  skillsRequired?: string;

  @IsOptional()
  @IsNumber()
  salaryMin?: number;

  @IsOptional()
  @IsNumber()
  salaryMax?: number;

  @IsOptional()
  @IsString()
  salaryCurrency?: string;

  @IsOptional()
  @IsString()
  sourceUrl?: string;

  @IsOptional()
  @IsString()
  employmentType?: string;
}

@ApiTags('jobs')
@ApiBearerAuth()
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all jobs with filters' })
  async findAll(
    @CurrentUser() user: User,
    @Query('search') search?: string,
    @Query('skills') skills?: string,
    @Query('location') location?: string,
    @Query('remote') remote?: boolean,
    @Query('minSalary') minSalary?: number,
    @Query('source') source?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: 'relevance' | 'date' | 'salary',
  ) {
    const filters: JobFilters = {
      search,
      skills: skills?.split(','),
      location,
      remote,
      minSalary,
      source: source?.split(','),
      page,
      limit,
      sortBy,
    };
    return this.jobsService.findAll(filters, user.id);
  }

  @Get('ranked')
  @ApiOperation({ summary: 'Get ranked jobs for current user' })
  async findRanked(
    @CurrentUser() user: User,
    @Query('limit') limit?: number,
  ) {
    return this.jobsService.findRanked(user.id, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a job by id' })
  async findOne(@Param('id') id: string) {
    return this.jobsService.findOne(id);
  }

  @Post('score')
  @ApiOperation({ summary: 'Score jobs for current user' })
  async scoreJobs(
    @CurrentUser() user: User,
    @Body() body: { jobIds?: string[] },
  ) {
    return this.jobsService.scoreJobs(user.id, body.jobIds);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new job' })
  async create(@Body() createJobDto: CreateJobDto) {
    return this.jobsService.create({
      ...createJobDto,
      source: 'manual',
      externalId: `manual-${Date.now()}`,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a job' })
  async update(@Param('id') id: string, @Body() updateJobDto: UpdateJobDto) {
    return this.jobsService.update(id, updateJobDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a job' })
  async delete(@Param('id') id: string) {
    return this.jobsService.delete(id);
  }
}

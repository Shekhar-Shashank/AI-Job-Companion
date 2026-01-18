import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { JobScoringService } from './job-scoring.service';

@Module({
  providers: [JobsService, JobScoringService],
  controllers: [JobsController],
  exports: [JobsService, JobScoringService],
})
export class JobsModule {}

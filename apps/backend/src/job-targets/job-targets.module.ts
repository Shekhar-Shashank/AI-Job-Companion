import { Module } from '@nestjs/common';
import { JobTargetsService } from './job-targets.service';
import { JobTargetsController } from './job-targets.controller';

@Module({
  providers: [JobTargetsService],
  controllers: [JobTargetsController],
  exports: [JobTargetsService],
})
export class JobTargetsModule {}

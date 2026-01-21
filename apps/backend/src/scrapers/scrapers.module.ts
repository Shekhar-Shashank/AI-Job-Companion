import { Module } from '@nestjs/common';
import { ScrapersService } from './scrapers.service';
import { ScrapersController } from './scrapers.controller';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [JobsModule],
  providers: [ScrapersService],
  controllers: [ScrapersController],
  exports: [ScrapersService],
})
export class ScrapersModule {}

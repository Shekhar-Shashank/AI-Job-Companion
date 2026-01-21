import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProfileModule } from './profile/profile.module';
import { SkillsModule } from './skills/skills.module';
import { ExperienceModule } from './experience/experience.module';
import { EducationModule } from './education/education.module';
import { JobTargetsModule } from './job-targets/job-targets.module';
import { PlansModule } from './plans/plans.module';
import { DocumentsModule } from './documents/documents.module';
import { JobsModule } from './jobs/jobs.module';
import { ApplicationsModule } from './applications/applications.module';
import { ChatModule } from './chat/chat.module';
import { EmbeddingsModule } from './embeddings/embeddings.module';
import { ScrapersModule } from './scrapers/scrapers.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Rate limiting configuration
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 3 }, // 3 requests/second
      { name: 'medium', ttl: 10000, limit: 20 }, // 20 requests/10 seconds
      { name: 'long', ttl: 60000, limit: 100 }, // 100 requests/minute
    ]),
    // Redis caching
    RedisModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    ProfileModule,
    SkillsModule,
    ExperienceModule,
    EducationModule,
    JobTargetsModule,
    PlansModule,
    DocumentsModule,
    JobsModule,
    ApplicationsModule,
    ChatModule,
    EmbeddingsModule,
    ScrapersModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

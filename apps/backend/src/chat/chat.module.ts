import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { RagService } from './rag.service';
import { AgentService } from './agent.service';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { ProfileModule } from '../profile/profile.module';
import { SkillsModule } from '../skills/skills.module';
import { ExperienceModule } from '../experience/experience.module';
import { JobsModule } from '../jobs/jobs.module';
import { PlansModule } from '../plans/plans.module';

@Module({
  imports: [
    EmbeddingsModule,
    ProfileModule,
    SkillsModule,
    ExperienceModule,
    JobsModule,
    PlansModule,
  ],
  providers: [ChatService, RagService, AgentService],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule {}

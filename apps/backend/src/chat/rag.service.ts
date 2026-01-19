import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { QdrantService } from '../embeddings/qdrant.service';

interface ContextSource {
  type: string;
  content: string;
  metadata?: Record<string, any>;
}

interface RagContext {
  text: string;
  sources: ContextSource[];
  tokenCount: number;
}

export interface ContextPreferences {
  sources?: string[];  // Which context sources to include
  customData?: string; // Custom data to include in context
  includeAll?: boolean; // Include all available context
}

export interface AvailableContextSource {
  id: string;
  name: string;
  description: string;
  available: boolean;
  itemCount?: number;
}

enum QueryIntent {
  PROFILE_QUERY = 'profile_query',
  JOB_SEARCH = 'job_search',
  JOB_RANKING = 'job_ranking',
  DOCUMENT_QUERY = 'document_query',
  PLAN_QUERY = 'plan_query',
  UPDATE_PROFILE = 'update_profile',
  UPDATE_PLAN = 'update_plan',
  TRACK_APPLICATION = 'track_application',
  APPLICATION_QUERY = 'application_query',
  WEB_SEARCH = 'web_search',
  COMPARISON = 'comparison',
  RECOMMENDATION = 'recommendation',
  GENERAL = 'general',
}

@Injectable()
export class RagService {
  private readonly maxTokens = 4000;

  constructor(
    private prisma: PrismaService,
    private embeddingsService: EmbeddingsService,
    private qdrantService: QdrantService,
  ) {}

  async buildContext(
    userId: string,
    query: string,
    preferences?: ContextPreferences,
  ): Promise<RagContext> {
    const sources: ContextSource[] = [];

    // If includeAll is set or specific sources are provided, use those
    if (preferences?.includeAll || preferences?.sources?.length) {
      await this.buildContextFromPreferences(userId, query, sources, preferences);
    } else {
      // Default behavior: use intent-based context selection
      const intent = await this.classifyIntent(query);
      await this.buildContextFromIntent(userId, query, sources, intent);
    }

    // Add custom data if provided
    if (preferences?.customData) {
      sources.push({
        type: 'custom_data',
        content: `Custom Context Data:\n${preferences.customData}`,
      });
    }

    // Build context text
    const text = this.formatContext(sources);
    const tokenCount = this.embeddingsService.estimateTokens(text);

    return { text, sources, tokenCount };
  }

  private async buildContextFromPreferences(
    userId: string,
    query: string,
    sources: ContextSource[],
    preferences: ContextPreferences,
  ): Promise<void> {
    const sourcesToInclude = preferences.includeAll
      ? ['profile', 'skills', 'experience', 'education', 'jobs', 'applications', 'documents', 'plans', 'chat_history']
      : preferences.sources || [];

    const promises: Promise<void>[] = [];

    for (const source of sourcesToInclude) {
      switch (source) {
        case 'profile':
          promises.push(this.addProfileSummary(userId, sources));
          break;
        case 'skills':
        case 'experience':
        case 'education':
          promises.push(this.addProfileContext(userId, query, sources));
          break;
        case 'jobs':
          promises.push(this.addJobContext(userId, query, sources));
          break;
        case 'applications':
          promises.push(this.addApplicationsContext(userId, sources));
          break;
        case 'documents':
          promises.push(this.addDocumentContext(userId, query, sources));
          break;
        case 'plans':
          promises.push(this.addPlanContext(userId, sources));
          break;
        case 'chat_history':
          promises.push(this.addChatHistoryContext(userId, sources));
          break;
      }
    }

    await Promise.all(promises);
  }

  private async buildContextFromIntent(
    userId: string,
    query: string,
    sources: ContextSource[],
    intent: QueryIntent,
  ): Promise<void> {
    switch (intent) {
      case QueryIntent.PROFILE_QUERY:
        await this.addProfileContext(userId, query, sources);
        break;

      case QueryIntent.JOB_SEARCH:
      case QueryIntent.JOB_RANKING:
        await this.addProfileContext(userId, query, sources);
        await this.addJobContext(userId, query, sources);
        break;

      case QueryIntent.DOCUMENT_QUERY:
        await this.addDocumentContext(userId, query, sources);
        break;

      case QueryIntent.PLAN_QUERY:
      case QueryIntent.UPDATE_PLAN:
        await this.addPlanContext(userId, sources);
        break;

      case QueryIntent.APPLICATION_QUERY:
      case QueryIntent.TRACK_APPLICATION:
        await this.addApplicationsContext(userId, sources);
        break;

      case QueryIntent.COMPARISON:
      case QueryIntent.RECOMMENDATION:
        await this.addProfileContext(userId, query, sources);
        await this.addJobContext(userId, query, sources);
        await this.addApplicationsContext(userId, sources);
        break;

      default:
        // For general queries, include profile summary
        await this.addProfileSummary(userId, sources);
    }
  }

  private async classifyIntent(query: string): Promise<QueryIntent> {
    const lowerQuery = query.toLowerCase();

    // Check for application-related queries
    if (
      lowerQuery.includes('application') ||
      lowerQuery.includes('applied') ||
      lowerQuery.includes('applying') ||
      lowerQuery.includes('status') ||
      lowerQuery.includes('interview')
    ) {
      if (
        lowerQuery.includes('track') ||
        lowerQuery.includes('update') ||
        lowerQuery.includes('change')
      ) {
        return QueryIntent.TRACK_APPLICATION;
      }
      return QueryIntent.APPLICATION_QUERY;
    }

    // Simple keyword-based classification
    if (
      lowerQuery.includes('skill') ||
      lowerQuery.includes('experience') ||
      lowerQuery.includes('education') ||
      lowerQuery.includes('profile') ||
      lowerQuery.includes('my ')
    ) {
      return QueryIntent.PROFILE_QUERY;
    }

    if (
      lowerQuery.includes('job') ||
      lowerQuery.includes('position') ||
      lowerQuery.includes('opening')
    ) {
      if (lowerQuery.includes('rank') || lowerQuery.includes('best') || lowerQuery.includes('match')) {
        return QueryIntent.JOB_RANKING;
      }
      return QueryIntent.JOB_SEARCH;
    }

    if (lowerQuery.includes('plan') || lowerQuery.includes('schedule') || lowerQuery.includes('todo')) {
      if (
        lowerQuery.includes('update') ||
        lowerQuery.includes('complete') ||
        lowerQuery.includes('add')
      ) {
        return QueryIntent.UPDATE_PLAN;
      }
      return QueryIntent.PLAN_QUERY;
    }

    if (lowerQuery.includes('document') || lowerQuery.includes('resume') || lowerQuery.includes('file')) {
      return QueryIntent.DOCUMENT_QUERY;
    }

    if (lowerQuery.includes('compare') || lowerQuery.includes('vs') || lowerQuery.includes('versus')) {
      return QueryIntent.COMPARISON;
    }

    if (lowerQuery.includes('recommend') || lowerQuery.includes('suggest') || lowerQuery.includes('should i')) {
      return QueryIntent.RECOMMENDATION;
    }

    return QueryIntent.GENERAL;
  }

  private async addProfileContext(
    userId: string,
    query: string,
    sources: ContextSource[],
  ): Promise<void> {
    // Get structured data
    const [skills, experiences, education] = await Promise.all([
      this.prisma.skill.findMany({
        where: { userId },
        include: { category: true },
        orderBy: { proficiencyLevel: 'desc' },
        take: 20,
      }),
      this.prisma.experience.findMany({
        where: { userId },
        orderBy: { startDate: 'desc' },
        take: 5,
      }),
      this.prisma.education.findMany({
        where: { userId },
        orderBy: { startDate: 'desc' },
        take: 3,
      }),
    ]);

    // Add skills
    if (skills.length > 0) {
      const skillsText = skills
        .map((s) => `- ${s.name}: ${s.proficiencyLevel}/5${s.category ? ` (${s.category.name})` : ''}`)
        .join('\n');
      sources.push({
        type: 'skills',
        content: `Your Skills:\n${skillsText}`,
      });
    }

    // Add experience
    if (experiences.length > 0) {
      const expText = experiences
        .map((e) => this.embeddingsService.experienceToText(e))
        .join('\n\n');
      sources.push({
        type: 'experience',
        content: `Your Work Experience:\n${expText}`,
      });
    }

    // Add education
    if (education.length > 0) {
      const eduText = education
        .map((e) => this.embeddingsService.educationToText(e))
        .join('\n\n');
      sources.push({
        type: 'education',
        content: `Your Education:\n${eduText}`,
      });
    }

    // Semantic search for relevant profile data
    try {
      const queryEmbedding = await this.embeddingsService.generateEmbedding(query);
      const results = await this.qdrantService.searchProfile(
        queryEmbedding,
        userId,
        5,
      );

      if (results.length > 0) {
        const relevantContent = results
          .map((r) => r.payload.content)
          .join('\n\n');
        sources.push({
          type: 'semantic_profile',
          content: `Relevant Profile Data:\n${relevantContent}`,
        });
      }
    } catch (error) {
      // Vector search failed, continue without it
      console.error('Vector search failed:', error);
    }
  }

  private async addProfileSummary(
    userId: string,
    sources: ContextSource[],
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: { take: 10, orderBy: { proficiencyLevel: 'desc' } },
        experience: { take: 2, orderBy: { startDate: 'desc' } },
        _count: { select: { skills: true, experience: true, education: true } },
      },
    });

    if (user) {
      const summary = [
        `Name: ${user.fullName}`,
        user.bio ? `Bio: ${user.bio}` : null,
        user.location ? `Location: ${user.location}` : null,
        `Skills: ${user._count.skills} total`,
        user.skills.length > 0
          ? `Top skills: ${user.skills.map((s) => s.name).join(', ')}`
          : null,
        `Experience: ${user._count.experience} positions`,
      ]
        .filter(Boolean)
        .join('\n');

      sources.push({
        type: 'profile_summary',
        content: `Your Profile Summary:\n${summary}`,
      });
    }
  }

  private async addJobContext(
    userId: string,
    query: string,
    sources: ContextSource[],
  ): Promise<void> {
    // Get job targets
    const targets = await this.prisma.jobTarget.findUnique({
      where: { userId },
    });

    if (targets) {
      const targetRoles = targets.targetRoles
        ? JSON.parse(targets.targetRoles)
        : [];
      const preferredLocations = targets.preferredLocations
        ? JSON.parse(targets.preferredLocations)
        : [];

      sources.push({
        type: 'job_targets',
        content: `Your Job Preferences:
- Target Roles: ${targetRoles.join(', ') || 'Not specified'}
- Salary Range: ${targets.minSalary || '?'} - ${targets.maxSalary || '?'} ${targets.salaryCurrency}
- Preferred Locations: ${preferredLocations.join(', ') || 'Not specified'}
- Remote Preference: ${targets.remotePreference || 'Any'}`,
      });
    }

    // Get ranked jobs
    const rankedJobs = await this.prisma.jobScore.findMany({
      where: { userId },
      orderBy: { overallScore: 'desc' },
      take: 10,
      include: { job: true },
    });

    if (rankedJobs.length > 0) {
      const jobsText = rankedJobs
        .map((js) => {
          const job = js.job;
          return `- ${job.title} at ${job.company} (Score: ${js.overallScore}%)
  Location: ${job.location || 'Not specified'}${job.isRemote ? ' (Remote)' : ''}
  Salary: ${job.salaryMin || '?'} - ${job.salaryMax || '?'}`;
        })
        .join('\n');

      sources.push({
        type: 'ranked_jobs',
        content: `Top Matching Jobs:\n${jobsText}`,
      });
    }
  }

  private async addDocumentContext(
    userId: string,
    query: string,
    sources: ContextSource[],
  ): Promise<void> {
    try {
      const queryEmbedding = await this.embeddingsService.generateEmbedding(query);
      const results = await this.qdrantService.searchDocuments(
        queryEmbedding,
        userId,
        5,
      );

      if (results.length > 0) {
        const chunks = results
          .map(
            (r) =>
              `[From ${r.payload.filename}]\n${r.payload.content || 'Content not available'}`,
          )
          .join('\n\n');

        sources.push({
          type: 'documents',
          content: `Relevant Document Content:\n${chunks}`,
        });
      }
    } catch (error) {
      console.error('Document search failed:', error);
    }

    // Also list available documents
    const documents = await this.prisma.document.findMany({
      where: { userId },
      select: { id: true, originalFilename: true, documentType: true },
      take: 10,
    });

    if (documents.length > 0) {
      const docList = documents
        .map((d) => `- ${d.originalFilename} (${d.documentType || 'unknown'})`)
        .join('\n');

      sources.push({
        type: 'document_list',
        content: `Your Documents:\n${docList}`,
      });
    }
  }

  private async addPlanContext(
    userId: string,
    sources: ContextSource[],
  ): Promise<void> {
    const plans = await this.prisma.plan.findMany({
      where: { userId, status: 'active' },
      include: {
        items: {
          where: { isCompleted: false },
          orderBy: [{ priority: 'desc' }, { scheduledDate: 'asc' }],
          take: 10,
        },
      },
      take: 5,
    });

    if (plans.length > 0) {
      const plansText = plans
        .map((p) => {
          const items = p.items
            .map((i) => `  - ${i.title}${i.scheduledDate ? ` (${new Date(i.scheduledDate).toLocaleDateString()})` : ''}`)
            .join('\n');
          return `${p.title} (${p.planType}):\n${items || '  No pending items'}`;
        })
        .join('\n\n');

      sources.push({
        type: 'plans',
        content: `Your Active Plans:\n${plansText}`,
      });
    }
  }

  private formatContext(sources: ContextSource[]): string {
    if (sources.length === 0) {
      return 'No relevant data found in your profile.';
    }

    return sources.map((s) => s.content).join('\n\n---\n\n');
  }
}

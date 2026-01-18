import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SkillsService } from '../skills/skills.service';
import { ExperienceService } from '../experience/experience.service';
import { PlansService } from '../plans/plans.service';
import { JobsService } from '../jobs/jobs.service';

interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
  handler: (params: any, userId: string) => Promise<any>;
}

@Injectable()
export class AgentService {
  private tools: Map<string, ToolDefinition> = new Map();

  constructor(
    private prisma: PrismaService,
    private skillsService: SkillsService,
    private experienceService: ExperienceService,
    private plansService: PlansService,
    private jobsService: JobsService,
  ) {
    this.registerTools();
  }

  private registerTools() {
    // Read tools
    this.tools.set('get_profile', {
      name: 'get_profile',
      description: 'Get user profile information',
      parameters: { type: 'object', properties: {} },
      handler: async (_, userId) => {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            fullName: true,
            email: true,
            phone: true,
            location: true,
            bio: true,
            linkedinUrl: true,
            githubUrl: true,
            portfolioUrl: true,
          },
        });
        return user;
      },
    });

    this.tools.set('get_skills', {
      name: 'get_skills',
      description: 'Get user skills with proficiency levels',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          min_proficiency: { type: 'number' },
        },
      },
      handler: async (params, userId) => {
        return this.skillsService.findAll(userId, params.category);
      },
    });

    this.tools.set('get_experience', {
      name: 'get_experience',
      description: 'Get work experience history',
      parameters: {
        type: 'object',
        properties: {
          current_only: { type: 'boolean' },
        },
      },
      handler: async (params, userId) => {
        return this.experienceService.findAll(userId, params.current_only);
      },
    });

    this.tools.set('get_plans', {
      name: 'get_plans',
      description: 'Get user plans',
      parameters: {
        type: 'object',
        properties: {
          plan_type: { type: 'string' },
          status: { type: 'string' },
        },
      },
      handler: async (params, userId) => {
        return this.plansService.findAll(userId, params.plan_type, params.status);
      },
    });

    this.tools.set('search_jobs', {
      name: 'search_jobs',
      description: 'Search for jobs',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          skills: { type: 'array', items: { type: 'string' } },
          location: { type: 'string' },
          remote_only: { type: 'boolean' },
          limit: { type: 'number' },
        },
        required: ['query'],
      },
      handler: async (params) => {
        return this.jobsService.findAll({
          search: params.query,
          skills: params.skills,
          location: params.location,
          remote: params.remote_only,
          limit: params.limit || 10,
        });
      },
    });

    this.tools.set('rank_jobs', {
      name: 'rank_jobs',
      description: 'Get ranked jobs based on user profile',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number' },
        },
      },
      handler: async (params, userId) => {
        return this.jobsService.findRanked(userId, params.limit || 10);
      },
    });

    // Write tools
    this.tools.set('add_skill', {
      name: 'add_skill',
      description: 'Add a new skill',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          proficiency_level: { type: 'number' },
          category: { type: 'string' },
          years_of_experience: { type: 'number' },
        },
        required: ['name', 'proficiency_level'],
      },
      handler: async (params, userId) => {
        return this.skillsService.create(userId, {
          name: params.name,
          proficiencyLevel: params.proficiency_level,
          categoryName: params.category,
          yearsOfExperience: params.years_of_experience,
        });
      },
    });

    this.tools.set('complete_plan_item', {
      name: 'complete_plan_item',
      description: 'Mark a plan item as complete',
      parameters: {
        type: 'object',
        properties: {
          plan_id: { type: 'string' },
          item_id: { type: 'string' },
        },
        required: ['plan_id', 'item_id'],
      },
      handler: async (params, userId) => {
        return this.plansService.completeItem(
          params.plan_id,
          params.item_id,
          userId,
        );
      },
    });
  }

  getToolDefinitions() {
    return Array.from(this.tools.values()).map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));
  }

  async executeTool(toolName: string, params: any, userId: string) {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Unknown tool: ${toolName}`);
    }
    return tool.handler(params, userId);
  }

  hasTool(toolName: string): boolean {
    return this.tools.has(toolName);
  }
}

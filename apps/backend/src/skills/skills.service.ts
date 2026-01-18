import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';

const SKILLS_CACHE_TTL = 300000; // 5 minutes

@Injectable()
export class SkillsService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private getCacheKey(userId: string, category?: string): string {
    return `skills:${userId}:${category || 'all'}`;
  }

  async findAll(userId: string, category?: string) {
    const cacheKey = this.getCacheKey(userId, category);

    // Try to get from cache first
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const skills = await this.prisma.skill.findMany({
      where: {
        userId,
        ...(category && { category: { name: category } }),
      },
      include: { category: true },
      orderBy: [{ isPrimary: 'desc' }, { proficiencyLevel: 'desc' }],
    });

    // Cache the result
    await this.cacheManager.set(cacheKey, skills, SKILLS_CACHE_TTL);

    return skills;
  }

  async findOne(id: string, userId: string) {
    const skill = await this.prisma.skill.findFirst({
      where: { id, userId },
      include: { category: true },
    });
    if (!skill) {
      throw new NotFoundException('Skill not found');
    }
    return skill;
  }

  private async invalidateCache(userId: string) {
    // Clear all skill caches for this user
    await this.cacheManager.del(this.getCacheKey(userId));
    // Also invalidate profile cache since it includes skills
    await this.cacheManager.del(`profile:${userId}`);
  }

  async create(userId: string, createSkillDto: CreateSkillDto) {
    // Check if skill already exists
    const existing = await this.prisma.skill.findUnique({
      where: {
        userId_name: { userId, name: createSkillDto.name },
      },
    });
    if (existing) {
      throw new ConflictException('Skill already exists');
    }

    // Handle category
    let categoryId = createSkillDto.categoryId;
    if (createSkillDto.categoryName && !categoryId) {
      const category = await this.prisma.skillCategory.upsert({
        where: { name: createSkillDto.categoryName },
        update: {},
        create: { name: createSkillDto.categoryName },
      });
      categoryId = category.id;
    }

    const skill = await this.prisma.skill.create({
      data: {
        userId,
        name: createSkillDto.name,
        proficiencyLevel: createSkillDto.proficiencyLevel,
        yearsOfExperience: createSkillDto.yearsOfExperience,
        isPrimary: createSkillDto.isPrimary ?? false,
        categoryId,
      },
      include: { category: true },
    });

    // Invalidate cache after create
    await this.invalidateCache(userId);

    return skill;
  }

  async update(id: string, userId: string, updateSkillDto: UpdateSkillDto) {
    await this.findOne(id, userId);

    // Handle category update
    let categoryId = updateSkillDto.categoryId;
    if (updateSkillDto.categoryName && !categoryId) {
      const category = await this.prisma.skillCategory.upsert({
        where: { name: updateSkillDto.categoryName },
        update: {},
        create: { name: updateSkillDto.categoryName },
      });
      categoryId = category.id;
    }

    const skill = await this.prisma.skill.update({
      where: { id },
      data: {
        name: updateSkillDto.name,
        proficiencyLevel: updateSkillDto.proficiencyLevel,
        yearsOfExperience: updateSkillDto.yearsOfExperience,
        isPrimary: updateSkillDto.isPrimary,
        categoryId,
      },
      include: { category: true },
    });

    // Invalidate cache after update
    await this.invalidateCache(userId);

    return skill;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    const result = await this.prisma.skill.delete({ where: { id } });

    // Invalidate cache after delete
    await this.invalidateCache(userId);

    return result;
  }

  async bulkCreate(
    userId: string,
    skills: CreateSkillDto[],
  ) {
    const results = [];
    for (const skill of skills) {
      try {
        const created = await this.create(userId, skill);
        results.push({ success: true, skill: created });
      } catch (error) {
        results.push({
          success: false,
          name: skill.name,
          error: error.message,
        });
      }
    }
    return results;
  }

  async getCategories() {
    return this.prisma.skillCategory.findMany({
      orderBy: { displayOrder: 'asc' },
    });
  }
}

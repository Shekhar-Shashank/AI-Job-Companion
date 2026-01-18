import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

const PROFILE_CACHE_TTL = 300000; // 5 minutes

@Injectable()
export class ProfileService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private getCacheKey(userId: string): string {
    return `profile:${userId}`;
  }

  async getProfile(userId: string) {
    const cacheKey = this.getCacheKey(userId);

    // Try to get from cache first
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        education: {
          orderBy: { startDate: 'desc' },
        },
        experience: {
          orderBy: { startDate: 'desc' },
        },
        skills: {
          include: { category: true },
          orderBy: { proficiencyLevel: 'desc' },
        },
        jobTargets: true,
      },
    });

    if (!user) {
      return null;
    }

    // Remove sensitive data
    const { passwordHash, ...profile } = user;

    // Cache the result
    await this.cacheManager.set(cacheKey, profile, PROFILE_CACHE_TTL);

    return profile;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const { passwordHash, ...user } = await this.prisma.user.update({
      where: { id: userId },
      data: updateProfileDto,
    });

    // Invalidate cache after update
    await this.cacheManager.del(this.getCacheKey(userId));

    return user;
  }

  async getProfileSummary(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        bio: true,
        location: true,
        _count: {
          select: {
            skills: true,
            experience: true,
            education: true,
          },
        },
      },
    });
    return user;
  }
}

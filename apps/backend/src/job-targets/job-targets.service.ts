import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateJobTargetsDto } from './dto/update-job-targets.dto';

@Injectable()
export class JobTargetsService {
  constructor(private prisma: PrismaService) {}

  async get(userId: string) {
    return this.prisma.jobTarget.findUnique({
      where: { userId },
    });
  }

  async upsert(userId: string, updateDto: UpdateJobTargetsDto) {
    const data = {
      targetRoles: updateDto.targetRoles
        ? JSON.stringify(updateDto.targetRoles)
        : undefined,
      targetCompanies: updateDto.targetCompanies
        ? JSON.stringify(updateDto.targetCompanies)
        : undefined,
      excludedCompanies: updateDto.excludedCompanies
        ? JSON.stringify(updateDto.excludedCompanies)
        : undefined,
      preferredLocations: updateDto.preferredLocations
        ? JSON.stringify(updateDto.preferredLocations)
        : undefined,
      preferredIndustries: updateDto.preferredIndustries
        ? JSON.stringify(updateDto.preferredIndustries)
        : undefined,
      minSalary: updateDto.minSalary,
      maxSalary: updateDto.maxSalary,
      salaryCurrency: updateDto.salaryCurrency,
      remotePreference: updateDto.remotePreference,
      noticePeriodDays: updateDto.noticePeriodDays,
      minCompanySize: updateDto.minCompanySize,
      maxCompanySize: updateDto.maxCompanySize,
    };

    return this.prisma.jobTarget.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }

  async getParsed(userId: string) {
    const targets = await this.get(userId);
    if (!targets) return null;

    return {
      ...targets,
      targetRoles: targets.targetRoles
        ? JSON.parse(targets.targetRoles)
        : [],
      targetCompanies: targets.targetCompanies
        ? JSON.parse(targets.targetCompanies)
        : [],
      excludedCompanies: targets.excludedCompanies
        ? JSON.parse(targets.excludedCompanies)
        : [],
      preferredLocations: targets.preferredLocations
        ? JSON.parse(targets.preferredLocations)
        : [],
      preferredIndustries: targets.preferredIndustries
        ? JSON.parse(targets.preferredIndustries)
        : [],
    };
  }
}

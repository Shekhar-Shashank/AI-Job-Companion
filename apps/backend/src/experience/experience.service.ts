import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { UpdateExperienceDto } from './dto/update-experience.dto';

@Injectable()
export class ExperienceService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, currentOnly?: boolean) {
    return this.prisma.experience.findMany({
      where: {
        userId,
        ...(currentOnly && { isCurrent: true }),
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const experience = await this.prisma.experience.findFirst({
      where: { id, userId },
    });
    if (!experience) {
      throw new NotFoundException('Experience not found');
    }
    return experience;
  }

  async create(userId: string, createExperienceDto: CreateExperienceDto) {
    return this.prisma.experience.create({
      data: {
        userId,
        company: createExperienceDto.company,
        title: createExperienceDto.title,
        location: createExperienceDto.location,
        employmentType: createExperienceDto.employmentType,
        startDate: new Date(createExperienceDto.startDate),
        endDate: createExperienceDto.endDate
          ? new Date(createExperienceDto.endDate)
          : null,
        isCurrent: createExperienceDto.isCurrent ?? false,
        description: createExperienceDto.description,
        achievements: createExperienceDto.achievements
          ? JSON.stringify(createExperienceDto.achievements)
          : null,
        technologies: createExperienceDto.technologies
          ? JSON.stringify(createExperienceDto.technologies)
          : null,
      },
    });
  }

  async update(
    id: string,
    userId: string,
    updateExperienceDto: UpdateExperienceDto,
  ) {
    await this.findOne(id, userId);

    const data: any = {};

    if (updateExperienceDto.company !== undefined)
      data.company = updateExperienceDto.company;
    if (updateExperienceDto.title !== undefined)
      data.title = updateExperienceDto.title;
    if (updateExperienceDto.location !== undefined)
      data.location = updateExperienceDto.location;
    if (updateExperienceDto.employmentType !== undefined)
      data.employmentType = updateExperienceDto.employmentType;
    if (updateExperienceDto.startDate !== undefined)
      data.startDate = new Date(updateExperienceDto.startDate);
    if (updateExperienceDto.endDate !== undefined)
      data.endDate = updateExperienceDto.endDate
        ? new Date(updateExperienceDto.endDate)
        : null;
    if (updateExperienceDto.isCurrent !== undefined)
      data.isCurrent = updateExperienceDto.isCurrent;
    if (updateExperienceDto.description !== undefined)
      data.description = updateExperienceDto.description;
    if (updateExperienceDto.achievements !== undefined)
      data.achievements = JSON.stringify(updateExperienceDto.achievements);
    if (updateExperienceDto.technologies !== undefined)
      data.technologies = JSON.stringify(updateExperienceDto.technologies);

    return this.prisma.experience.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.experience.delete({ where: { id } });
  }

  async getTotalYears(userId: string): Promise<number> {
    const experiences = await this.prisma.experience.findMany({
      where: { userId },
      select: { startDate: true, endDate: true, isCurrent: true },
    });

    let totalMonths = 0;
    for (const exp of experiences) {
      const end = exp.isCurrent ? new Date() : exp.endDate || new Date();
      const months =
        (end.getFullYear() - exp.startDate.getFullYear()) * 12 +
        (end.getMonth() - exp.startDate.getMonth());
      totalMonths += months;
    }

    return Math.round((totalMonths / 12) * 10) / 10;
  }
}

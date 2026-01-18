import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';

@Injectable()
export class ApplicationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, status?: string) {
    return this.prisma.jobApplication.findMany({
      where: {
        userId,
        ...(status && { status }),
      },
      include: { job: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const application = await this.prisma.jobApplication.findFirst({
      where: { id, userId },
      include: { job: true },
    });
    if (!application) {
      throw new NotFoundException('Application not found');
    }
    return application;
  }

  async create(userId: string, createDto: CreateApplicationDto) {
    return this.prisma.jobApplication.create({
      data: {
        userId,
        ...createDto,
        interviews: createDto.interviews
          ? JSON.stringify(createDto.interviews)
          : null,
      },
      include: { job: true },
    });
  }

  async update(id: string, userId: string, updateDto: UpdateApplicationDto) {
    await this.findOne(id, userId);

    const data: any = { ...updateDto };
    if (updateDto.interviews) {
      data.interviews = JSON.stringify(updateDto.interviews);
    }

    return this.prisma.jobApplication.update({
      where: { id },
      data,
      include: { job: true },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.jobApplication.delete({ where: { id } });
  }

  async getStats(userId: string) {
    const applications = await this.prisma.jobApplication.findMany({
      where: { userId },
    });

    const stats = {
      total: applications.length,
      byStatus: {} as Record<string, number>,
    };

    for (const app of applications) {
      stats.byStatus[app.status] = (stats.byStatus[app.status] || 0) + 1;
    }

    return stats;
  }
}

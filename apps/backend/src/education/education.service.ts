import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEducationDto } from './dto/create-education.dto';
import { UpdateEducationDto } from './dto/update-education.dto';

@Injectable()
export class EducationService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.education.findMany({
      where: { userId },
      orderBy: { startDate: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const education = await this.prisma.education.findFirst({
      where: { id, userId },
    });
    if (!education) {
      throw new NotFoundException('Education not found');
    }
    return education;
  }

  async create(userId: string, createEducationDto: CreateEducationDto) {
    return this.prisma.education.create({
      data: {
        userId,
        institution: createEducationDto.institution,
        degree: createEducationDto.degree,
        fieldOfStudy: createEducationDto.fieldOfStudy,
        startDate: createEducationDto.startDate
          ? new Date(createEducationDto.startDate)
          : null,
        endDate: createEducationDto.endDate
          ? new Date(createEducationDto.endDate)
          : null,
        grade: createEducationDto.grade,
        description: createEducationDto.description,
        isCurrent: createEducationDto.isCurrent ?? false,
      },
    });
  }

  async update(
    id: string,
    userId: string,
    updateEducationDto: UpdateEducationDto,
  ) {
    await this.findOne(id, userId);

    const data: any = {};

    if (updateEducationDto.institution !== undefined)
      data.institution = updateEducationDto.institution;
    if (updateEducationDto.degree !== undefined)
      data.degree = updateEducationDto.degree;
    if (updateEducationDto.fieldOfStudy !== undefined)
      data.fieldOfStudy = updateEducationDto.fieldOfStudy;
    if (updateEducationDto.startDate !== undefined)
      data.startDate = updateEducationDto.startDate
        ? new Date(updateEducationDto.startDate)
        : null;
    if (updateEducationDto.endDate !== undefined)
      data.endDate = updateEducationDto.endDate
        ? new Date(updateEducationDto.endDate)
        : null;
    if (updateEducationDto.grade !== undefined)
      data.grade = updateEducationDto.grade;
    if (updateEducationDto.description !== undefined)
      data.description = updateEducationDto.description;
    if (updateEducationDto.isCurrent !== undefined)
      data.isCurrent = updateEducationDto.isCurrent;

    return this.prisma.education.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.education.delete({ where: { id } });
  }
}

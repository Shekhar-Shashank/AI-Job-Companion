import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { CreatePlanItemDto } from './dto/create-plan-item.dto';
import { UpdatePlanItemDto } from './dto/update-plan-item.dto';

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, planType?: string, status?: string) {
    return this.prisma.plan.findMany({
      where: {
        userId,
        ...(planType && { planType }),
        ...(status && status !== 'all' && { status }),
      },
      include: {
        items: {
          orderBy: [{ priority: 'desc' }, { scheduledDate: 'asc' }],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const plan = await this.prisma.plan.findFirst({
      where: { id, userId },
      include: {
        items: {
          orderBy: [{ priority: 'desc' }, { scheduledDate: 'asc' }],
        },
      },
    });
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }
    return plan;
  }

async create(userId: string, createPlanDto: CreatePlanDto) {
  const { items, startDate, endDate, ...rest } = createPlanDto;

  return this.prisma.plan.create({
    data: {
      userId,
      ...rest,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      items: items
        ? {
            create: items.map((item) => ({
              ...item,
              tags: item.tags ? JSON.stringify(item.tags) : null,
            })),
          }
        : undefined,
    },
    include: { items: true },
  });
}


  async update(id: string, userId: string, updatePlanDto: UpdatePlanDto) {
    await this.findOne(id, userId);

    return this.prisma.plan.update({
      where: { id },
      data: updatePlanDto,
      include: { items: true },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.plan.delete({ where: { id } });
  }

  // Plan Items
  async addItem(planId: string, userId: string, createItemDto: CreatePlanItemDto) {
    await this.findOne(planId, userId);

    return this.prisma.planItem.create({
      data: {
        planId,
        ...createItemDto,
        tags: createItemDto.tags ? JSON.stringify(createItemDto.tags) : null,
      },
    });
  }

  async updateItem(
    planId: string,
    itemId: string,
    userId: string,
    updateItemDto: UpdatePlanItemDto,
  ) {
    await this.findOne(planId, userId);

    const item = await this.prisma.planItem.findFirst({
      where: { id: itemId, planId },
    });
    if (!item) {
      throw new NotFoundException('Plan item not found');
    }

    const data: any = { ...updateItemDto };
    if (updateItemDto.tags) {
      data.tags = JSON.stringify(updateItemDto.tags);
    }
    if (updateItemDto.isCompleted && !item.completedAt) {
      data.completedAt = new Date();
    }

    return this.prisma.planItem.update({
      where: { id: itemId },
      data,
    });
  }

  async removeItem(planId: string, itemId: string, userId: string) {
    await this.findOne(planId, userId);

    const item = await this.prisma.planItem.findFirst({
      where: { id: itemId, planId },
    });
    if (!item) {
      throw new NotFoundException('Plan item not found');
    }

    return this.prisma.planItem.delete({ where: { id: itemId } });
  }

  async completeItem(planId: string, itemId: string, userId: string) {
    return this.updateItem(planId, itemId, userId, {
      isCompleted: true,
    });
  }
}

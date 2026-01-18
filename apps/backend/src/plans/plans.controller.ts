import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { CreatePlanItemDto } from './dto/create-plan-item.dto';
import { UpdatePlanItemDto } from './dto/update-plan-item.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('plans')
@ApiBearerAuth()
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  @ApiOperation({ summary: 'Get all plans' })
  async findAll(
    @CurrentUser() user: User,
    @Query('type') planType?: string,
    @Query('status') status?: string,
  ) {
    return this.plansService.findAll(user.id, planType, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a plan by id' })
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.plansService.findOne(id, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new plan' })
  async create(@CurrentUser() user: User, @Body() createPlanDto: CreatePlanDto) {
    return this.plansService.create(user.id, createPlanDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a plan' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() updatePlanDto: UpdatePlanDto,
  ) {
    return this.plansService.update(id, user.id, updatePlanDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a plan' })
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.plansService.remove(id, user.id);
  }

  // Plan Items
  @Post(':id/items')
  @ApiOperation({ summary: 'Add an item to a plan' })
  async addItem(
    @Param('id') planId: string,
    @CurrentUser() user: User,
    @Body() createItemDto: CreatePlanItemDto,
  ) {
    return this.plansService.addItem(planId, user.id, createItemDto);
  }

  @Put(':id/items/:itemId')
  @ApiOperation({ summary: 'Update a plan item' })
  async updateItem(
    @Param('id') planId: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: User,
    @Body() updateItemDto: UpdatePlanItemDto,
  ) {
    return this.plansService.updateItem(planId, itemId, user.id, updateItemDto);
  }

  @Post(':id/items/:itemId/complete')
  @ApiOperation({ summary: 'Mark a plan item as complete' })
  async completeItem(
    @Param('id') planId: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: User,
  ) {
    return this.plansService.completeItem(planId, itemId, user.id);
  }

  @Delete(':id/items/:itemId')
  @ApiOperation({ summary: 'Delete a plan item' })
  async removeItem(
    @Param('id') planId: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: User,
  ) {
    return this.plansService.removeItem(planId, itemId, user.id);
  }
}

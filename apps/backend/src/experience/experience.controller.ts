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
import { ExperienceService } from './experience.service';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { UpdateExperienceDto } from './dto/update-experience.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('experience')
@ApiBearerAuth()
@Controller('experience')
export class ExperienceController {
  constructor(private readonly experienceService: ExperienceService) {}

  @Get()
  @ApiOperation({ summary: 'Get all work experience' })
  async findAll(
    @CurrentUser() user: User,
    @Query('currentOnly') currentOnly?: boolean,
  ) {
    return this.experienceService.findAll(user.id, currentOnly);
  }

  @Get('total-years')
  @ApiOperation({ summary: 'Get total years of experience' })
  async getTotalYears(@CurrentUser() user: User) {
    const years = await this.experienceService.getTotalYears(user.id);
    return { totalYears: years };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an experience by id' })
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.experienceService.findOne(id, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new experience' })
  async create(
    @CurrentUser() user: User,
    @Body() createExperienceDto: CreateExperienceDto,
  ) {
    return this.experienceService.create(user.id, createExperienceDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an experience' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() updateExperienceDto: UpdateExperienceDto,
  ) {
    return this.experienceService.update(id, user.id, updateExperienceDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an experience' })
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.experienceService.remove(id, user.id);
  }
}

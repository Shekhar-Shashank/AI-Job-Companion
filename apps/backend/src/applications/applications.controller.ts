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
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('applications')
@ApiBearerAuth()
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all job applications' })
  async findAll(@CurrentUser() user: User, @Query('status') status?: string) {
    return this.applicationsService.findAll(user.id, status);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get application statistics' })
  async getStats(@CurrentUser() user: User) {
    return this.applicationsService.getStats(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an application by id' })
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.applicationsService.findOne(id, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new application' })
  async create(
    @CurrentUser() user: User,
    @Body() createDto: CreateApplicationDto,
  ) {
    return this.applicationsService.create(user.id, createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an application' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() updateDto: UpdateApplicationDto,
  ) {
    return this.applicationsService.update(id, user.id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an application' })
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.applicationsService.remove(id, user.id);
  }
}

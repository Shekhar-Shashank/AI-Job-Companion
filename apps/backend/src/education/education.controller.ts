import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EducationService } from './education.service';
import { CreateEducationDto } from './dto/create-education.dto';
import { UpdateEducationDto } from './dto/update-education.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('education')
@ApiBearerAuth()
@Controller('education')
export class EducationController {
  constructor(private readonly educationService: EducationService) {}

  @Get()
  @ApiOperation({ summary: 'Get all education entries' })
  async findAll(@CurrentUser() user: User) {
    return this.educationService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an education entry by id' })
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.educationService.findOne(id, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new education entry' })
  async create(
    @CurrentUser() user: User,
    @Body() createEducationDto: CreateEducationDto,
  ) {
    return this.educationService.create(user.id, createEducationDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an education entry' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() updateEducationDto: UpdateEducationDto,
  ) {
    return this.educationService.update(id, user.id, updateEducationDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an education entry' })
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.educationService.remove(id, user.id);
  }
}

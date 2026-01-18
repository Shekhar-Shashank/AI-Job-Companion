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
import { SkillsService } from './skills.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('skills')
@ApiBearerAuth()
@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all skills' })
  async findAll(@CurrentUser() user: User, @Query('category') category?: string) {
    return this.skillsService.findAll(user.id, category);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all skill categories' })
  async getCategories() {
    return this.skillsService.getCategories();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a skill by id' })
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.skillsService.findOne(id, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new skill' })
  async create(@CurrentUser() user: User, @Body() createSkillDto: CreateSkillDto) {
    return this.skillsService.create(user.id, createSkillDto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Bulk create skills' })
  async bulkCreate(
    @CurrentUser() user: User,
    @Body() skills: CreateSkillDto[],
  ) {
    return this.skillsService.bulkCreate(user.id, skills);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a skill' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() updateSkillDto: UpdateSkillDto,
  ) {
    return this.skillsService.update(id, user.id, updateSkillDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a skill' })
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.skillsService.remove(id, user.id);
  }
}

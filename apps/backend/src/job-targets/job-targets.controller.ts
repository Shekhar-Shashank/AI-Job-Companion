import { Controller, Get, Put, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JobTargetsService } from './job-targets.service';
import { UpdateJobTargetsDto } from './dto/update-job-targets.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('job-targets')
@ApiBearerAuth()
@Controller('job-targets')
export class JobTargetsController {
  constructor(private readonly jobTargetsService: JobTargetsService) {}

  @Get()
  @ApiOperation({ summary: 'Get job search preferences' })
  async get(@CurrentUser() user: User) {
    return this.jobTargetsService.getParsed(user.id);
  }

  @Put()
  @ApiOperation({ summary: 'Update job search preferences' })
  async update(
    @CurrentUser() user: User,
    @Body() updateDto: UpdateJobTargetsDto,
  ) {
    return this.jobTargetsService.upsert(user.id, updateDto);
  }
}

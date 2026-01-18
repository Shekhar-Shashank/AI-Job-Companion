import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('profile')
@ApiBearerAuth()
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user profile with all data' })
  async getProfile(@CurrentUser() user: User) {
    return this.profileService.getProfile(user.id);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get profile summary' })
  async getProfileSummary(@CurrentUser() user: User) {
    return this.profileService.getProfileSummary(user.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update profile' })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.profileService.updateProfile(user.id, updateProfileDto);
  }
}

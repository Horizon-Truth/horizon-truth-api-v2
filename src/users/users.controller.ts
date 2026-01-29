import {
  Controller,
  Get,
  UseGuards,
  Request,
  Put,
  Body,
  Query,
  Param,
  Delete,
  Patch,
  Ip,
  Post,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../shared/enums/user-role.enum';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserPreferencesDto } from './dto/user-preferences.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) { }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Return current user profile.' })
  getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Put('me/profile')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Username already exists.',
  })
  async updateProfile(@Request() req, @Body() updateDto: UpdateProfileDto) {
    const updatedUser = await this.usersService.updateProfile(
      req.user.userId,
      updateDto,
    );
    await this.usersService.logActivity(
      req.user.userId,
      'PROFILE_UPDATE',
      { updates: Object.keys(updateDto) },
      req.ip,
      req.headers['user-agent'],
    );
    return updatedUser;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/preferences')
  @ApiOperation({ summary: 'Get current user preferences' })
  @ApiResponse({ status: 200, description: 'User preferences retrieved.' })
  async getPreferences(@Request() req) {
    return this.usersService.getPreferences(req.user.userId);
  }

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { PlayersService } from './players.service';
import { CreatePlayerProfileDto } from './dto/create-player-profile.dto';
import { UpdatePlayerProfileDto } from './dto/update-player-profile.dto';
import { InitializeProfileDto } from './dto/initialize-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Players')
@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get('avatars')
  @ApiOperation({ summary: 'List all available avatars' })
  @ApiResponse({ status: 200, description: 'Avatars retrieved successfully.' })
  async getAvatars() {
    return this.playersService.getAvatars();
  }

  @Get('regions')
  @ApiOperation({ summary: 'List all available fictional regions' })
  @ApiResponse({ status: 200, description: 'Regions retrieved successfully.' })
  async getRegions() {
    return this.playersService.getRegions();
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create player profile' })
  @ApiResponse({ status: 201, description: 'Profile created successfully.' })
  @ApiResponse({ status: 400, description: 'Profile already exists.' })
  async createProfile(
    @Request() req,
    @Body() createDto: CreatePlayerProfileDto,
  ) {
    return this.playersService.createProfile(req.user.userId, createDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile/me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get own player profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Profile not found.' })
  async getMyProfile(@Request() req) {
    return this.playersService.getProfile(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile/me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update own player profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully.' })
  @ApiResponse({ status: 404, description: 'Profile not found.' })
  async updateMyProfile(
    @Request() req,
    @Body() updateDto: UpdatePlayerProfileDto,
  ) {
    return this.playersService.updateProfile(req.user.userId, updateDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('onboarding/complete')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark onboarding as complete' })
  @ApiResponse({ status: 200, description: 'Onboarding completed.' })
  @ApiResponse({ status: 404, description: 'Profile not found.' })
  async completeOnboarding(@Request() req) {
    await this.playersService.completeOnboarding(req.user.userId);
    return { message: 'Onboarding completed successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('initialize')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Initialize player profile during onboarding (Level 0)',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile initialized successfully.',
  })
  @ApiResponse({ status: 404, description: 'Avatar or Profile not found.' })
  async initializeProfile(
    @Request() req,
    @Body() initializeDto: InitializeProfileDto,
  ) {
    return this.playersService.initializeProfile(
      req.user.userId,
      initializeDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats/me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get own player statistics' })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully.' })
  async getMyStats(@Request() req) {
    return this.playersService.getPlayerStats(req.user.userId);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get public player profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Profile not found.' })
  async getPublicProfile(@Param('userId') userId: string) {
    return this.playersService.getProfile(userId);
  }
}

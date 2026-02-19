import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../shared/enums/user-role.enum';
import { PlayersService } from './players.service';

@ApiTags('Admin / Players')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYSTEM_ADMIN)
@Controller('admin/players')
export class AdminPlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get('profiles')
  @ApiOperation({ summary: 'List all player profiles (Admin only)' })
  async findAll(@Query() query: any) {
    return this.playersService.findAllProfiles(query);
  }

  @Get('profiles/:userId')
  @ApiOperation({ summary: 'Get player profile details' })
  async findOne(@Param('userId') userId: string) {
    return this.playersService.getProfile(userId);
  }

  @Put('profiles/:userId')
  @ApiOperation({ summary: 'Update player profile' })
  async update(@Param('userId') userId: string, @Body() updateDto: any) {
    return this.playersService.updateProfileByAdmin(userId, updateDto);
  }

  @Delete('profiles/:userId')
  @ApiOperation({ summary: 'Delete player profile' })
  async remove(@Param('userId') userId: string) {
    return this.playersService.deleteProfileByAdmin(userId);
  }
}

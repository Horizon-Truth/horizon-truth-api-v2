import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    Param,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GamificationService } from './gamification.service';
import { AwardBadgeDto } from './dto/award-badge.dto';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../shared/enums/user-role.enum';

@ApiTags('Gamification')
@Controller('gamification')
export class GamificationController {
    constructor(private readonly gamificationService: GamificationService) { }

    @Get('badges')
    @ApiOperation({ summary: 'List all available badges' })
    @ApiResponse({ status: 200, description: 'Badges retrieved successfully.' })
    async getBadges() {
        return this.gamificationService.getBadges();
    }

    @UseGuards(JwtAuthGuard)
    @Get('badges/me')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current user earned badges' })
    @ApiResponse({ status: 200, description: 'User badges retrieved.' })
    async getMyBadges(@Request() req) {
        return this.gamificationService.getUserBadges(req.user.userId);
    }

    @Get('badges/user/:userId')
    @ApiOperation({ summary: 'Get user badges by user ID' })
    @ApiResponse({ status: 200, description: 'User badges retrieved.' })
    async getUserBadges(@Param('userId') userId: string) {
        return this.gamificationService.getUserBadges(userId);
    }

    @Get('leaderboard')
    @ApiOperation({ summary: 'Get leaderboard with filters' })
    @ApiResponse({ status: 200, description: 'Leaderboard retrieved successfully.' })
    async getLeaderboard(@Query() query: LeaderboardQueryDto) {
        return this.gamificationService.getLeaderboard(query);
    }

    @UseGuards(JwtAuthGuard)
    @Get('leaderboard/me')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current user rank on leaderboard' })
    @ApiResponse({ status: 200, description: 'User rank retrieved.' })
    async getMyRank(@Request() req, @Query() query: LeaderboardQueryDto) {
        return this.gamificationService.getUserRank(req.user.userId, query.type, query.period);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SYSTEM_ADMIN)
    @Post('admin/award')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Manually award a badge to a user (ADMIN only)' })
    @ApiResponse({ status: 201, description: 'Badge awarded successfully.' })
    @ApiResponse({ status: 404, description: 'Badge or user not found.' })
    @ApiResponse({ status: 400, description: 'User already has this badge.' })
    async awardBadge(@Body() awardBadgeDto: AwardBadgeDto) {
        return this.gamificationService.awardBadge(
            awardBadgeDto.userId,
            awardBadgeDto.badgeCode,
            awardBadgeDto.metadata,
        );
    }
}

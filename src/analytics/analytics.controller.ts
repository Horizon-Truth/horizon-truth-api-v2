import { Controller, Get, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../shared/enums/user-role.enum';

@Controller('analytics')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    @Get('stats')
    @Roles(UserRole.SYSTEM_ADMIN, UserRole.ORG_ADMIN)
    async getStats() {
        return this.analyticsService.getSystemStats();
    }

    @Get('health')
    @Roles(UserRole.SYSTEM_ADMIN)
    async getHealth() {
        return this.analyticsService.getSystemHealth();
    }
}

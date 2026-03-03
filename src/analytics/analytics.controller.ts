import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../shared/enums/user-role.enum';
import { OrganizationsService } from '../organizations/organizations.service';

@Controller('analytics')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AnalyticsController {
    constructor(
        private readonly analyticsService: AnalyticsService,
        private readonly organizationsService: OrganizationsService,
    ) { }

    @Get('stats')
    @Roles(UserRole.SYSTEM_ADMIN, UserRole.ORG_ADMIN)
    async getStats(@Request() req: any) {
        const user = req.user;
        let orgId: string | undefined;

        if (user.role === UserRole.ORG_ADMIN) {
            const id = await this.organizationsService.findUserOrganization(user.userId);
            orgId = id ?? undefined;
        }

        return this.analyticsService.getSystemStats(orgId);
    }

    @Get('health')
    @Roles(UserRole.SYSTEM_ADMIN)
    async getHealth() {
        return this.analyticsService.getSystemHealth();
    }
}

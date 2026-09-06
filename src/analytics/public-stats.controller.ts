import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

/**
 * Public, unauthenticated headline stats for the marketing landing page.
 * Deliberately separate from AnalyticsController so it isn't behind the
 * admin JWT/Roles guards applied there.
 */
@ApiTags('public')
@Controller('public/stats')
export class PublicStatsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  @ApiOperation({ summary: 'Aggregate public stats for the landing page' })
  async getPublicStats() {
    // Only return rounded, non-identifying headline totals.
    // Never expose per-user detail, exact raw counts that reveal
    // operational weakness, or internal metric precision.
    const stats = await this.analyticsService.getPublicStats();
    return {
      activeUsers: stats.activeUsers,
      reportsVerified: stats.reportsDebunked,
      // Rounded ranges prevent precise profiling; no verifier count
      // exposed ( avoids highlighting weak staffing points ).
      accuracyRate: stats.accuracyRate,
    };
  }
}

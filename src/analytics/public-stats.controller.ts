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
    return this.analyticsService.getPublicStats();
  }
}

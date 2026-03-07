import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsSnapshot } from './entities/analytics-snapshot.entity';
import { MisinformationHeatmap } from './entities/misinformation-heatmap.entity';
import { OrganizationDashboard } from './entities/organization-dashboard.entity';
import { DashboardWidget } from './entities/dashboard-widget.entity';
import { PlayerSceneEvent } from './entities/player-scene-event.entity';
import { PlayerAlgorithmProfile } from './entities/player-algorithm-profile.entity';

import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { PublicStatsController } from './public-stats.controller';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsSnapshot } from './entities/analytics-snapshot.entity';
import { MisinformationHeatmap } from './entities/misinformation-heatmap.entity';
import { OrganizationDashboard } from './entities/organization-dashboard.entity';
import { DashboardWidget } from './entities/dashboard-widget.entity';

import { PlayerSceneEvent } from './entities/player-scene-event.entity';
import { PlayerAlgorithmProfile } from './entities/player-algorithm-profile.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            AnalyticsSnapshot,
            MisinformationHeatmap,
            OrganizationDashboard,
            DashboardWidget,
            PlayerSceneEvent,
            PlayerAlgorithmProfile,
        ]),
    ],
    exports: [TypeOrmModule],
})
export class AnalyticsModule { }

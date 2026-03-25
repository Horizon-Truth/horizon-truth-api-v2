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

import { User } from '../users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { PlayerProfile } from '../players/entities/player-profile.entity';
import { Scenario } from '../engine/entities/scenario.entity';
import { GameOutcome } from '../engine/entities/game-outcome.entity';
import { PlayerScenarioRecord } from '../engine/entities/player-scenario-record.entity';
import { Feedback } from '../feedback/entities/feedback.entity';
import { Blog } from '../blogs/entities/blog.entity';
import { Resource } from '../resources/entities/resource.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { GuestPlay } from '../engine/entities/guest-play.entity';
import { OrganizationsModule } from '../organizations/organizations.module';
import { OrganizationUser } from '../organizations/entities/organization-user.entity';
import { Report } from '../reports/entities/report.entity';

@Module({
  imports: [
    OrganizationsModule,
    TypeOrmModule.forFeature([
      AnalyticsSnapshot,
      MisinformationHeatmap,
      OrganizationDashboard,
      DashboardWidget,
      PlayerSceneEvent,
      PlayerAlgorithmProfile,
      User,
      Organization,
      PlayerProfile,
      Scenario,
      Feedback,
      Blog,
      Resource,
      Contact,
      GuestPlay,
      OrganizationUser,
      Report,
      GameOutcome,
      PlayerScenarioRecord,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService, TypeOrmModule],
})
export class AnalyticsModule { }

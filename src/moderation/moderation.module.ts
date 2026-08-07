import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { IncidentsModule } from '../incidents/incidents.module';

import { IncidentReport } from '../incidents/entities/incident-report.entity';
import { IncidentStatus } from '../incidents/entities/incident-status.entity';
import { ModerationAction } from '../incidents/entities/moderation-action.entity';
import { Content } from '../incidents/entities/content.entity';
import { User } from '../users/entities/user.entity';

import { ModerationFlag } from './entities/moderation-flag.entity';
import { ModerationFlagAssignment } from './entities/moderation-flag-assignment.entity';
import { ModerationNote } from './entities/moderation-note.entity';
import { ModerationNoteRevision } from './entities/moderation-note-revision.entity';
import { ModerationAppeal } from './entities/moderation-appeal.entity';
import { UserSanction } from './entities/user-sanction.entity';
import { ContentModerationState } from './entities/content-moderation-state.entity';
import { ModerationNotification } from './entities/moderation-notification.entity';
import { ModerationSavedFilter } from './entities/moderation-saved-filter.entity';

import { ModerationAuditService } from './services/moderation-audit.service';
import { ModerationFlagsService } from './services/moderation-flags.service';
import { ModerationContentService } from './services/moderation-content.service';
import { ContentPreviewService } from './services/content-preview.service';
import { ModerationNotificationsService } from './services/moderation-notifications.service';
import { ModerationCasesService } from './services/moderation-cases.service';
import { ModerationNotesService } from './services/moderation-notes.service';
import { ModerationUsersService } from './services/moderation-users.service';
import { ModerationAppealsService } from './services/moderation-appeals.service';
import { ModerationAnalyticsService } from './services/moderation-analytics.service';
import { ModerationSavedFiltersService } from './services/moderation-saved-filters.service';

import {
  ModerationCasesController,
  ModerationIntakeController,
} from './controllers/moderation-cases.controller';
import {
  ModerationNotesController,
  ModerationUsersController,
} from './controllers/moderation-users.controller';
import {
  AppealReviewController,
  AppealSubmissionController,
  MyModerationRecordController,
} from './controllers/moderation-appeals.controller';
import { ModerationFlagsController } from './controllers/moderation-flags.controller';
import { ModerationAnalyticsController } from './controllers/moderation-analytics.controller';
import { ModerationNotificationsController } from './controllers/moderation-notifications.controller';

/**
 * Q2M2A3 — moderation tools.
 *
 * Owns the abuse-report workflow, the flag system, user enforcement, appeals,
 * the moderation audit trail and the analytics behind the moderator dashboard.
 *
 * It reuses the `incidents` entities as the case model rather than introducing
 * a third "report" concept alongside the crowdsourced fact-check `reports`
 * table, which serves an unrelated purpose.
 *
 * `ModerationContentService` is exported so content modules can consult the
 * visibility overlay before serving an object to the public.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Case model, shared with the incidents module.
      IncidentReport,
      IncidentStatus,
      ModerationAction,
      Content,
      User,
      // Moderation-owned tables.
      ModerationFlag,
      ModerationFlagAssignment,
      ModerationNote,
      ModerationNoteRevision,
      ModerationAppeal,
      UserSanction,
      ContentModerationState,
      ModerationNotification,
      ModerationSavedFilter,
    ]),
    AuditLogsModule,
    IncidentsModule,
  ],
  controllers: [
    ModerationCasesController,
    ModerationIntakeController,
    ModerationUsersController,
    ModerationNotesController,
    AppealSubmissionController,
    AppealReviewController,
    MyModerationRecordController,
    ModerationFlagsController,
    ModerationAnalyticsController,
    ModerationNotificationsController,
  ],
  providers: [
    ModerationAuditService,
    ModerationFlagsService,
    ModerationContentService,
    ContentPreviewService,
    ModerationNotificationsService,
    ModerationCasesService,
    ModerationNotesService,
    ModerationUsersService,
    ModerationAppealsService,
    ModerationAnalyticsService,
    ModerationSavedFiltersService,
  ],
  exports: [
    ModerationContentService,
    ModerationFlagsService,
    ModerationNotificationsService,
    TypeOrmModule,
  ],
})
export class ModerationModule {}

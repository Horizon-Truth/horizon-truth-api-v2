import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { PlayerProfile } from '../players/entities/player-profile.entity';
import { Scenario } from '../engine/entities/scenario.entity';
import { Feedback } from '../feedback/entities/feedback.entity';
import { Blog } from '../blogs/entities/blog.entity';
import { Resource } from '../resources/entities/resource.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { GuestPlay } from '../engine/entities/guest-play.entity';

import { OrganizationUser } from '../organizations/entities/organization-user.entity';
import { Report } from '../reports/entities/report.entity';
import { ReportVerification } from '../reports/entities/report-verification.entity';
import { ReportStatus } from '../shared/enums/report-status.enum';
import { GameOutcome } from '../engine/entities/game-outcome.entity';
import { PlayerScenarioRecord } from '../engine/entities/player-scenario-record.entity';

@Injectable()
export class AnalyticsService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Organization)
        private readonly organizationRepository: Repository<Organization>,
        @InjectRepository(PlayerProfile)
        private readonly playerProfileRepository: Repository<PlayerProfile>,
        @InjectRepository(Scenario)
        private readonly scenarioRepository: Repository<Scenario>,
        @InjectRepository(Feedback)
        private readonly feedbackRepository: Repository<Feedback>,
        @InjectRepository(Blog)
        private readonly blogRepository: Repository<Blog>,
        @InjectRepository(Resource)
        private readonly resourceRepository: Repository<Resource>,
        @InjectRepository(Contact)
        private readonly contactRepository: Repository<Contact>,
        @InjectRepository(GuestPlay)
        private readonly guestPlayRepository: Repository<GuestPlay>,
        @InjectRepository(OrganizationUser)
        private readonly organizationUserRepository: Repository<OrganizationUser>,
        @InjectRepository(Report)
        private readonly reportRepository: Repository<Report>,
        @InjectRepository(ReportVerification)
        private readonly reportVerificationRepository: Repository<ReportVerification>,
        @InjectRepository(GameOutcome)
        private readonly gameOutcomeRepository: Repository<GameOutcome>,
        @InjectRepository(PlayerScenarioRecord)
        private readonly playerScenarioRecordRepository: Repository<PlayerScenarioRecord>,
    ) { }

    /**
     * Aggregate, non-sensitive counts for the public landing page. No auth
     * required — returns only headline totals, never per-user data.
     */
    async getPublicStats() {
        const [
            userCount,
            guestCount,
            reportsDebunked,
            verifierRow,
            credibilityRow,
        ] = await Promise.all([
            this.userRepository.count(),
            this.guestPlayRepository.count(),
            this.reportRepository.count({ where: { status: ReportStatus.VERIFIED } }),
            this.reportVerificationRepository
                .createQueryBuilder('rv')
                .select('COUNT(DISTINCT rv.user_id)', 'count')
                .getRawOne<{ count: string }>(),
            this.reportRepository
                .createQueryBuilder('r')
                .select('AVG(r.credibilityScore)', 'avg')
                .where('r.credibilityScore IS NOT NULL')
                .getRawOne<{ avg: string }>(),
        ]);
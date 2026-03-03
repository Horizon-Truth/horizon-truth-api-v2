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
    ) { }

    async getSystemStats(orgId?: string) {
        let userCount, orgCount, playerCount, scenarioCount, feedbackCount, reportCount, blogCount, resourceCount, contactCount, guestCount;

        if (orgId) {
            // Scoped requests
            [
                userCount,
                orgCount,
                playerCount,
                scenarioCount,
                feedbackCount,
                reportCount,
                blogCount,
                resourceCount,
                contactCount,
                guestCount
            ] = await Promise.all([
                this.organizationUserRepository.count({ where: { organizationId: orgId } }),
                Promise.resolve(1),
                this.playerProfileRepository.createQueryBuilder('pp')
                    .innerJoin('organization_users', 'ou', 'ou.user_id = pp.user_id')
                    .where('ou.organization_id = :orgId', { orgId })
                    .getCount(),
                this.scenarioRepository.count(),
                this.feedbackRepository.createQueryBuilder('fb')
                    .innerJoin('organization_users', 'ou', 'ou.user_id = fb.user_id')
                    .where('ou.organization_id = :orgId', { orgId })
                    .getCount(),
                this.reportRepository.createQueryBuilder('r')
                    .innerJoin('organization_users', 'ou', 'ou.user_id = r.reporter_id')
                    .where('ou.organization_id = :orgId', { orgId })
                    .getCount(),
                this.blogRepository.count(),
                this.resourceRepository.count(),
                this.contactRepository.count(),
                this.guestPlayRepository.count()
            ]);
        } else {
            // Global requests
            [
                userCount,
                orgCount,
                playerCount,
                scenarioCount,
                feedbackCount,
                reportCount,
                blogCount,
                resourceCount,
                contactCount,
                guestCount
            ] = await Promise.all([
                this.userRepository.count(),
                this.organizationRepository.count(),
                this.playerProfileRepository.count(),
                this.scenarioRepository.count(),
                this.feedbackRepository.count(),
                this.reportRepository.count(),
                this.blogRepository.count(),
                this.resourceRepository.count(),
                this.contactRepository.count(),
                this.guestPlayRepository.count()
            ]);
        }

        // Distribution logic - for simplicity, we keep global distributions or empty for org admins
        const orgTypesQuery = this.organizationRepository
            .createQueryBuilder('org')
            .select('org.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .groupBy('org.status');

        if (orgId) {
            orgTypesQuery.andWhere('org.id = :orgId', { orgId });
        }
        const orgTypes = await orgTypesQuery.getRawMany();

        const feedbackStatusQuery = this.feedbackRepository
            .createQueryBuilder('fb')
            .select('fb.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .groupBy('fb.status');

        if (orgId) {
            feedbackStatusQuery.innerJoin('organization_users', 'ou', 'ou.user_id = fb.user_id')
                .andWhere('ou.organization_id = :orgId', { orgId });
        }
        const feedbackStatus = await feedbackStatusQuery.getRawMany();

        return {
            overview: {
                users: userCount,
                organizations: orgCount,
                players: playerCount,
                scenarios: scenarioCount,
                feedback: feedbackCount,
                reports: reportCount,
                blogs: blogCount,
                resources: resourceCount,
                contacts: contactCount,
                guestPlays: guestCount
            },
            distributions: {
                organizations: Object.fromEntries(orgTypes.map(t => [t.status, parseInt(t.count)])),
                feedback: Object.fromEntries(feedbackStatus.map(s => [s.status, parseInt(s.count)]))
            }
        };
    }

    async getSystemHealth() {
        const uptime = process.uptime();
        const memoryUsage = process.memoryUsage();

        // Simple DB check
        let dbStatus = 'UP';
        try {
            await this.userRepository.query('SELECT 1');
        } catch (error) {
            dbStatus = 'DOWN';
        }

        return {
            status: dbStatus === 'UP' ? 'HEALTHY' : 'UNHEALTHY',
            uptime,
            memory: {
                heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
                heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),   // MB
                rss: Math.round(memoryUsage.rss / 1024 / 1024),           // MB
            },
            database: dbStatus,
            timestamp: new Date().toISOString(),
            version: '2.0.0',
            environment: process.env.NODE_ENV || 'development'
        };
    }
}

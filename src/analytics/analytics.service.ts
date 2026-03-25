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
        @InjectRepository(GameOutcome)
        private readonly gameOutcomeRepository: Repository<GameOutcome>,
        @InjectRepository(PlayerScenarioRecord)
        private readonly playerScenarioRecordRepository: Repository<PlayerScenarioRecord>,
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

    async getGamePlayStats(orgId?: string) {
        const outcomeQuery = this.gameOutcomeRepository.createQueryBuilder('go')
            .leftJoin('scenarios', 's', 's.id = go.scenario_id');

        const recordQuery = this.playerScenarioRecordRepository.createQueryBuilder('psr');

        if (orgId) {
            outcomeQuery.innerJoin('organization_users', 'ou', 'ou.user_id = go.user_id')
                .where('ou.organization_id = :orgId', { orgId });
            recordQuery.innerJoin('organization_users', 'ou', 'ou.user_id = psr.user_id')
                .where('ou.organization_id = :orgId', { orgId });
        }

        const [totalSessions, uniquePlayersData, avgScoreData, avgAccuracyData, completionRateData] = await Promise.all([
            outcomeQuery.getCount().catch(() => 0),
            outcomeQuery.clone().select('COUNT(DISTINCT go.user_id)', 'count').getRawOne().catch(() => ({ count: 0 })),
            outcomeQuery.clone().select('AVG(go.score)', 'avg').getRawOne().catch(() => ({ avg: 0 })),
            recordQuery.clone().select('AVG(psr.best_accuracy_rate)', 'avg').getRawOne().catch(() => ({ avg: 0 })),
            recordQuery.clone().select('AVG(CASE WHEN psr.is_completed THEN 100 ELSE 0 END)', 'rate').getRawOne().catch(() => ({ rate: 0 })),
        ]);

        // Play Trend (Last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const trendData = await this.gameOutcomeRepository.createQueryBuilder('go')
            .select("DATE_TRUNC('day', go.created_at)", 'date')
            .addSelect('COUNT(*)', 'count')
            .where('go.created_at >= :date', { date: thirtyDaysAgo })
            .groupBy('date')
            .orderBy('date', 'ASC')
            .getRawMany()
            .catch(() => []);

        // Scenario Popularity
        const popularityData = await this.gameOutcomeRepository.createQueryBuilder('go')
            .leftJoin('scenarios', 's', 's.id::text = go.scenario_id')
            .select('s.title', 'title')
            .addSelect('COUNT(*)', 'count')
            .where('s.title IS NOT NULL')
            .groupBy('s.title')
            .orderBy('count', 'DESC')
            .limit(5)
            .getRawMany()
            .catch(() => []);

        // Outcome Distribution
        const outcomeDist = await this.gameOutcomeRepository.createQueryBuilder('go')
            .select('go.outcome_type', 'type')
            .addSelect('COUNT(*)', 'count')
            .groupBy('go.outcome_type')
            .getRawMany()
            .catch(() => []);

        // Difficulty Distribution
        const difficultyDist = await this.gameOutcomeRepository.createQueryBuilder('go')
            .leftJoin('scenarios', 's', 's.id::text = go.scenario_id')
            .select('s.difficulty', 'difficulty')
            .addSelect('COUNT(*)', 'count')
            .where('s.difficulty IS NOT NULL')
            .groupBy('s.difficulty')
            .getRawMany()
            .catch(() => []);

        return {
            overview: {
                totalSessions: totalSessions || 0,
                uniquePlayers: parseInt(uniquePlayersData?.count || '0') || 0,
                avgScore: Math.round(parseFloat(avgScoreData?.avg || '0') || 0),
                avgAccuracy: Math.round(parseFloat(avgAccuracyData?.avg || '0') || 0),
                completionRate: Math.round(parseFloat(completionRateData?.rate || '0') || 0),
            },
            trend: (trendData || []).map(d => ({
                date: d.date ? new Date(d.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                count: parseInt(d.count || '0')
            })),
            popularity: (popularityData || []).map(d => ({
                name: d.title || 'Unknown',
                count: parseInt(d.count || '0')
            })),
            distributions: {
                outcomes: Object.fromEntries((outcomeDist || []).map(d => [d.type, parseInt(d.count || '0')])),
                difficulties: Object.fromEntries((difficultyDist || []).map(d => [d.difficulty, parseInt(d.count || '0')]))
            }
        };
    }

    async getRecentSessions(orgId?: string, limit: number = 10) {
        const query = this.gameOutcomeRepository.createQueryBuilder('go')
            .leftJoin('scenarios', 's', 's.id::text = go.scenario_id')
            .leftJoin('users', 'u', 'u.id::text = go.user_id')
            .select([
                'go.id',
                'go.score',
                'go.outcome_type',
                'go.created_at',
                's.title',
                'u.full_name'
            ])
            .orderBy('go.created_at', 'DESC')
            .limit(limit);

        if (orgId) {
            query.innerJoin('organization_users', 'ou', 'ou.user_id = go.user_id')
                .where('ou.organization_id = :orgId', { orgId });
        }

        const rawData = await query.getRawMany();
        
        return rawData.map(d => ({
            id: d.go_id,
            score: d.go_score,
            outcome: d.go_outcome_type,
            createdAt: d.go_created_at,
            scenarioTitle: d.s_title || 'Unknown Scenario',
            playerName: d.u_full_name || 'Anonymous'
        }));
    }

    async exportGamePlayCSV(orgId?: string): Promise<string> {
        const query = this.gameOutcomeRepository.createQueryBuilder('go')
            .leftJoin('scenarios', 's', 's.id::text = go.scenario_id')
            .leftJoin('users', 'u', 'u.id::text = go.user_id')
            .select([
                'go.id',
                'go.score',
                'go.outcome_type',
                'go.created_at',
                'go.message',
                's.title',
                'u.full_name',
                'u.email'
            ])
            .orderBy('go.created_at', 'DESC');

        if (orgId) {
            query.innerJoin('organization_users', 'ou', 'ou.user_id = go.user_id')
                .where('ou.organization_id = :orgId', { orgId });
        }

        const data = await query.getRawMany();

        const headers = ['Session ID', 'Player Name', 'Email', 'Scenario', 'Score', 'Outcome', 'Message', 'Completed At'];
        const rows = data.map(d => [
            d.go_id,
            d.u_full_name || 'Anonymous',
            d.u_email || 'N/A',
            d.s_title || 'Unknown',
            d.go_score,
            d.go_outcome_type,
            (d.go_message || '').replace(/"/g, '""'),
            d.go_created_at ? new Date(d.go_created_at).toISOString() : 'N/A'
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        return csvContent;
    }
}

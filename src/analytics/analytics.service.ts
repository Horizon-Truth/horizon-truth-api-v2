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
    ) { }

    async getSystemStats() {
        const [
            totalUsers,
            totalOrganizations,
            totalPlayers,
            totalScenarios,
            totalFeedback,
            totalBlogs,
            totalResources,
            totalContacts,
            totalGuestPlays,
        ] = await Promise.all([
            this.userRepository.count(),
            this.organizationRepository.count(),
            this.playerProfileRepository.count(),
            this.scenarioRepository.count(),
            this.feedbackRepository.count(),
            this.blogRepository.count(),
            this.resourceRepository.count(),
            this.contactRepository.count(),
            this.guestPlayRepository.count(),
        ]);

        const orgStatusDistribution = await this.organizationRepository
            .createQueryBuilder('org')
            .select('org.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .groupBy('org.status')
            .getRawMany();

        const feedbackStatusDistribution = await this.feedbackRepository
            .createQueryBuilder('feedback')
            .select('feedback.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .groupBy('feedback.status')
            .getRawMany();

        return {
            overview: {
                users: totalUsers,
                organizations: totalOrganizations,
                players: totalPlayers,
                scenarios: totalScenarios,
                feedback: totalFeedback,
                blogs: totalBlogs,
                resources: totalResources,
                contacts: totalContacts,
                guestPlays: totalGuestPlays,
            },
            distributions: {
                organizations: orgStatusDistribution.reduce((acc, curr) => {
                    acc[curr.status] = parseInt(curr.count);
                    return acc;
                }, {}),
                feedback: feedbackStatusDistribution.reduce((acc, curr) => {
                    acc[curr.status] = parseInt(curr.count);
                    return acc;
                }, {}),
            },
            contentBreakdown: {
                blogs: totalBlogs,
                resources: totalResources,
            },
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

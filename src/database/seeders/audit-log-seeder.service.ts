import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../audit-logs/entities/audit-log.entity';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class AuditLogSeederService {
  private readonly logger = new Logger(AuditLogSeederService.name);

  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async seed() {
    this.logger.log('Starting audit log data seeding...');

    const count = await this.auditLogRepository.count();
    if (count > 0) {
      this.logger.log('Audit logs already seeded, skipping.');
      return;
    }

    const admin = await this.userRepository.findOne({ where: { role: 'SYSTEM_ADMIN' } as any });
    
    if (!admin) {
      this.logger.warn('No SYSTEM_ADMIN user found, audit logs will be seeded without userId.');
    }

    const sampleLogs = [
      {
        userId: admin?.id,
        action: 'POST /api/scenarios',
        entityType: 'engine',
        entityId: 'scenario-001',
        metadata: { name: 'Sample Scenario', description: 'Created via seeder' },
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      {
        userId: admin?.id,
        action: 'PUT /api/users/profile',
        entityType: 'users',
        entityId: admin?.id || 'admin-user-id',
        metadata: { updatedFields: ['fullName'] },
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      {
        userId: admin?.id,
        action: 'DELETE /api/blogs/123',
        entityType: 'blogs',
        entityId: '123',
        metadata: { title: 'Old Post' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X) Firefox/123.0',
      },
      {
        userId: admin?.id,
        action: 'PATCH /api/organizations/org-456',
        entityType: 'organizations',
        entityId: 'org-456',
        metadata: { status: 'active' },
        ipAddress: '10.0.0.5',
        userAgent: 'PostmanRuntime/7.36.1',
      }
    ];

    for (const logData of sampleLogs) {
      const log = this.auditLogRepository.create(logData);
      await this.auditLogRepository.save(log);
    }

    this.logger.log(`Seeded ${sampleLogs.length} audit logs!`);
  }
}

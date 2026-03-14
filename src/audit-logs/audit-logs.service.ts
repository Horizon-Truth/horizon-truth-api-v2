import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async createLog(data: {
    userId?: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLog> {
    const log = this.auditLogRepository.create(data);
    return this.auditLogRepository.save(log);
  }

  async findAll(options: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    entityType?: string;
  }) {
    const { page = 1, limit = 20, userId, action, entityType } = options;
    const query = this.auditLogRepository.createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .orderBy('log.createdAt', 'DESC');

    if (userId) {
      query.andWhere('log.userId = :userId', { userId });
    }

    if (action) {
      query.andWhere('log.action ILIKE :action', { action: `%${action}%` });
    }

    if (entityType) {
      query.andWhere('log.entityType ILIKE :entityType', { entityType: `%${entityType}%` });
    }

    const [items, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

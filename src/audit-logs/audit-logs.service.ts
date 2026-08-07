import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

export interface AuditLogQuery {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  /** Free-text across action, entity type/id, reason and IP address. */
  search?: string;
  from?: string | Date;
  to?: string | Date;
}

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
    previousValue?: Record<string, unknown> | null;
    newValue?: Record<string, unknown> | null;
    reason?: string | null;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLog> {
    const log = this.auditLogRepository.create(data);
    return this.auditLogRepository.save(log);
  }

  async findAll(options: AuditLogQuery) {
    const { page = 1, limit = 20 } = options;
    const query = this.buildQuery(options);

    const [items, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async exportLogs(options: Omit<AuditLogQuery, 'page' | 'limit'>) {
    return this.buildQuery(options).getMany();
  }

  private buildQuery(options: AuditLogQuery): SelectQueryBuilder<AuditLog> {
    const { userId, action, entityType, entityId, search, from, to } = options;

    const query = this.auditLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .orderBy('log.createdAt', 'DESC');

    if (userId) {
      query.andWhere('log.userId = :userId', { userId });
    }

    if (action) {
      query.andWhere('log.action ILIKE :action', { action: `%${action}%` });
    }

    if (entityType) {
      query.andWhere('log.entityType ILIKE :entityType', {
        entityType: `%${entityType}%`,
      });
    }

    if (entityId) {
      query.andWhere('log.entityId = :entityId', { entityId });
    }

    if (search) {
      query.andWhere(
        `(log.action ILIKE :search
          OR log.entityType ILIKE :search
          OR log.entityId ILIKE :search
          OR log.reason ILIKE :search
          OR log.ipAddress ILIKE :search)`,
        { search: `%${search}%` },
      );
    }

    if (from) {
      query.andWhere('log.createdAt >= :from', { from: new Date(from) });
    }

    if (to) {
      query.andWhere('log.createdAt <= :to', { to: new Date(to) });
    }

    return query;
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { OrganizationStatus } from '../shared/enums/organization-status.enum';
import { UsersService } from '../users/users.service';
import { UserRole } from '../shared/enums/user-role.enum';
import { OrganizationUserRole } from '../shared/enums/organization-user-role.enum';
import { OrganizationUser } from './entities/organization-user.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
  ) { }

  async findAll(query: any): Promise<any> {
    const { status, type, country, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const queryBuilder =
      this.organizationRepository.createQueryBuilder('organization');

    if (status) {
      queryBuilder.andWhere('organization.status = :status', { status });
    }

    if (type) {
      queryBuilder.andWhere('organization.type = :type', { type });
    }

    if (country) {
      queryBuilder.andWhere('organization.country = :country', { country });
    }

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('organization.createdAt', 'DESC')
      .getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
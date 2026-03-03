import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { OrganizationStatus } from '../shared/enums/organization-status.enum';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
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
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<Organization> {
    const org = await this.organizationRepository.findOne({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async create(createDto: any): Promise<Organization> {
    const org = this.organizationRepository.create(createDto);
    return this.organizationRepository.save(Array.isArray(org) ? org[0] : org);
  }

  async update(id: string, updateDto: any): Promise<Organization> {
    await this.organizationRepository.update(id, updateDto);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    const result = await this.organizationRepository.delete(id);
    if (result.affected === 0)
      throw new NotFoundException('Organization not found');
  }

  async updateStatus(
    id: string,
    status: OrganizationStatus,
  ): Promise<Organization> {
    await this.organizationRepository.update(id, { status });
    return this.findById(id);
  }

  async findOrganizationUsers(orgId: string): Promise<any[]> {
    const org = await this.organizationRepository.findOne({
      where: { id: orgId },
      relations: ['users', 'users.user'],
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org.users;
  }

  async addOrganizationUser(
    orgId: string,
    userId: string,
    role: string,
  ): Promise<any> {
    const org = await this.findById(orgId);
    // Note: In a real app, we'd inject OrganizationUserRepository here.
    // Assuming the service has access to the repository or we can use the manager.
    const manager = this.organizationRepository.manager;
    const orgUser = manager.create('OrganizationUser', {
      organizationId: orgId,
      userId: userId,
      role: role,
    });
    return manager.save(orgUser);
  }
}

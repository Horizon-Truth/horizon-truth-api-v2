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
    const { adminEmail, adminPassword, adminFullName, ...orgData } = createDto;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Create Organization
      const org = this.organizationRepository.create(orgData as Partial<Organization>);
      const savedOrg = await queryRunner.manager.save(org);

      // 2. Create Admin User if details provided
      if (adminEmail && adminPassword) {
        const user = await this.usersService.create({
          email: adminEmail,
          password: adminPassword,
          fullName: adminFullName || orgData.name + ' Admin',
          role: UserRole.ORG_ADMIN,
          username: adminEmail.split('@')[0] + '_' + Math.random().toString(36).substring(2, 5),
        });

        // 3. Link User to Organization
        const orgUser = queryRunner.manager.create(OrganizationUser, {
          organizationId: savedOrg.id,
          userId: user.id,
          role: OrganizationUserRole.ADMIN,
        });
        await queryRunner.manager.save(orgUser);
      }

      await queryRunner.commitTransaction();
      return savedOrg;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      if (err.message?.includes('already exists')) {
        throw new BadRequestException(err.message);
      }
      throw err;
    } finally {
      await queryRunner.release();
    }
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
    await this.findById(orgId);
    const manager = this.organizationRepository.manager;
    const orgUser = manager.create(OrganizationUser, {
      organizationId: orgId,
      userId: userId,
      role: role as OrganizationUserRole,
    });
    return manager.save(orgUser);
  }

  async findUserOrganization(userId: string): Promise<string | null> {
    const orgUser = await this.dataSource.getRepository(OrganizationUser).findOne({
      where: { userId },
      select: ['organizationId'],
    });
    return orgUser ? orgUser.organizationId : null;
  }
}

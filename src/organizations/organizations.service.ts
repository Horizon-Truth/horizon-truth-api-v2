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
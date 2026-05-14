import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { OrganizationUser } from './entities/organization-user.entity';
import { OrganizationsService } from './organizations.service';
import { AdminOrganizationsController } from './admin-organizations.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, OrganizationUser]),
    UsersModule,
  ],
  providers: [OrganizationsService],
  controllers: [AdminOrganizationsController],
  exports: [TypeOrmModule, OrganizationsService],
})
export class OrganizationsModule { }

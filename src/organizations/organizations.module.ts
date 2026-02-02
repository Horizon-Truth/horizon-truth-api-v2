import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { OrganizationUser } from './entities/organization-user.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Organization, OrganizationUser])],
    exports: [TypeOrmModule],
})
export class OrganizationsModule { }

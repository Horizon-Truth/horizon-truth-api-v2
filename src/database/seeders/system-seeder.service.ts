import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../shared/enums/user-role.enum';
import { UserStatus } from '../../shared/enums/user-status.enum';

@Injectable()
export class SystemSeederService {
    private readonly logger = new Logger(SystemSeederService.name);

    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) { }

    async seed() {
        this.logger.log('Starting system data seeding...');

        await this.seedSuperAdmin();

        this.logger.log('System data seeding completed!');
    }

    private async seedSuperAdmin() {
        this.logger.log('Seeding super admin...');

        const superAdminEmail = 'admin@horizon.ai';
        const superAdminUsername = 'superadmin';

        const existing = await this.userRepository.findOne({
            where: [
                { email: superAdminEmail },
                { username: superAdminUsername }
            ]
        });

        if (existing) {
            this.logger.log('Super admin already exists, skipping.');
            return;
        }

        const passwordHash = await bcrypt.hash('Admin@123', 10);

        const superAdmin = this.userRepository.create({
            email: superAdminEmail,
            username: superAdminUsername,
            fullName: 'System Administrator',
            passwordHash: passwordHash,
            role: UserRole.SYSTEM_ADMIN,
            status: UserStatus.ACTIVE,
            isVerified: true,
            apiKey: 'horizon_admin_master_key_' + Math.random().toString(36).substring(2, 10),
        });

        await this.userRepository.save(superAdmin);
        this.logger.log('Super admin created successfully!');
        this.logger.log(`Credentials: ${superAdminEmail} / Admin@123`);
    }
}

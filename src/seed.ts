import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { UserRole } from './shared/enums/user-role.enum';
import { UserStatus } from './shared/enums/user-status.enum';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PlayerProfile } from './players/entities/player-profile.entity';
import { Avatar } from './players/entities/avatar.entity';
import { Repository } from 'typeorm';
import { AvatarGender } from './shared/enums/avatar-gender.enum';
import { AvatarAgeGroup } from './shared/enums/avatar-age-group.enum';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const usersService = app.get(UsersService);
    const playerProfileRepo = app.get<Repository<PlayerProfile>>(getRepositoryToken(PlayerProfile));
    const avatarRepo = app.get<Repository<Avatar>>(getRepositoryToken(Avatar));

    console.log('--- Starting Seeding ---');

    // 1. Seed default avatar if none exists
    let defaultAvatar = await avatarRepo.findOne({ where: {} });
    if (!defaultAvatar) {
        console.log('Seeding default avatar...');
        defaultAvatar = avatarRepo.create({
            name: 'Default Hero',
            imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
            gender: AvatarGender.MALE,
            ageGroup: AvatarAgeGroup.ADULT,
        });
        defaultAvatar = await avatarRepo.save(defaultAvatar);
    }

    const roles = Object.values(UserRole);
    const defaultPassword = 'password123';

    for (const role of roles) {
        const email = `${role.toLowerCase()}@horizon.com`;
        const username = role.toLowerCase();

        const existingUser = await usersService.findOneByEmail(email);
        if (existingUser) {
            console.log(`User for role ${role} already exists, skipping...`);
            continue;
        }

        console.log(`Creating user for role: ${role}...`);
        const user = await usersService.create({
            email,
            username,
            fullName: `${role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())} User`,
            role,
            status: UserStatus.ACTIVE,
            password: defaultPassword,
            isVerified: true,
        });

        // 2. If role is PLAYER, create a profile
        if (role === UserRole.PLAYER) {
            console.log('Creating player profile...');
            const profile = playerProfileRepo.create({
                userId: user.id,
                nickname: 'HorizonExplorer',
                avatarId: defaultAvatar.id,
                trustScoreInitial: 50,
                onboardingCompleted: true,
                onboardingCompletedAt: new Date(),
            });
            await playerProfileRepo.save(profile);
        }
    }

    console.log('--- Seeding Completed Successfully ---');
    await app.close();
}

bootstrap().catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
});

import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { UserActivity } from './entities/user-activity.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserPreferencesDto } from './dto/user-preferences.dto';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        @InjectRepository(UserActivity)
        private activityRepository: Repository<UserActivity>,
    ) { }

    async findOneByEmail(email: string): Promise<User | null> {
        return this.usersRepository.findOne({
            where: { email },
            select: ['id', 'email', 'passwordHash', 'fullName', 'role', 'apiKey'], // explicitly select passwordHash for auth
        });
    }

    async findOneByUsername(username: string): Promise<User | null> {
        return this.usersRepository.findOne({
            where: { username },
            select: ['id', 'email', 'username', 'passwordHash', 'fullName', 'role', 'apiKey'],
        });
    }

    async findOneByApiKey(apiKey: string): Promise<User | null> {
        return this.usersRepository.findOne({ where: { apiKey } });
    }

    async create(userData: Partial<User> & { password?: string }): Promise<User> {
        const existingUser = await this.usersRepository.findOne({
            where: [
                { email: userData.email },
                { username: userData.username }
            ]
        });

        if (existingUser) {
            throw new Error('User with this email or username already exists');
        }

        const createData: Partial<User> = { ...userData };
        if (userData.password) {
            createData.passwordHash = await bcrypt.hash(userData.password, 10);
        }

        if (!createData.apiKey) {
            createData.apiKey =
                Math.random().toString(36).substring(2, 15) +
                Math.random().toString(36).substring(2, 15);
        }

        const user = this.usersRepository.create(createData);
        return this.usersRepository.save(user);
    }

    async findById(id: string): Promise<User | null> {
        return this.usersRepository.findOne({ where: { id } });
    }

    async findByIdWithRefreshToken(id: string): Promise<User | null> {
        return this.usersRepository.findOne({
            where: { id },
            select: ['id', 'email', 'username', 'role', 'hashedRefreshToken'],
        });
    }

    async update(id: string, updateData: Partial<User>): Promise<User | null> {
        await this.usersRepository.update(id, updateData);
        return this.usersRepository.findOne({ where: { id } });
    }

    async findOneByResetToken(token: string): Promise<User | null> {
        return this.usersRepository.findOne({
            where: { resetPasswordToken: token },
            select: ['id', 'email', 'resetPasswordToken', 'resetPasswordExpires'],
        });
    }

    async findAll(query: any): Promise<any> {
        const page = query.page || 1;
        const limit = query.limit || 10;
        const skip = (page - 1) * limit;

        const [users, total] = await this.usersRepository.findAndCount({
            where: { deletedAt: IsNull() }, // Exclude soft-deleted users
            skip,
            take: limit,
        });

        return {
            data: users,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            }
        };
    }

    // New Methods for Task 3

    async updateProfile(userId: string, updateDto: UpdateProfileDto): Promise<User> {
        // Check for username uniqueness if provided
        if (updateDto.username) {
            const existingUser = await this.usersRepository.findOne({
                where: { username: updateDto.username },
            });
            if (existingUser && existingUser.id !== userId) {
                throw new BadRequestException('Username already exists');
            }
        }

        await this.usersRepository.update(userId, updateDto);
        const updatedUser = await this.findById(userId);

        if (!updatedUser) {
            throw new NotFoundException('User not found');
        }

        return updatedUser;
    }

    async updatePreferences(userId: string, preferencesDto: UserPreferencesDto): Promise<User> {
        const user = await this.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Merge with existing preferences
        const updatedPreferences = {
            ...user.preferences,
            ...preferencesDto,
        };

        await this.usersRepository.update(userId, { preferences: updatedPreferences });
        const updatedUser = await this.findById(userId);
        if (!updatedUser) {
            throw new NotFoundException('User not found');
        }
        return updatedUser;
    }

    async getPreferences(userId: string): Promise<any> {
        const user = await this.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return user.preferences || {};
    }

    async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
        const user = await this.usersRepository.findOne({
            where: { id: userId },
            select: ['id', 'passwordHash'],
        });

        if (!user || !user.passwordHash) {
            throw new NotFoundException('User not found');
        }

        const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Current password is incorrect');
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        await this.usersRepository.update(userId, { passwordHash: newPasswordHash });
    }

    async softDelete(userId: string): Promise<void> {
        await this.usersRepository.update(userId, { deletedAt: new Date() });
    }

    async hardDelete(userId: string): Promise<void> {
        await this.usersRepository.delete(userId);
    }

    async restoreUser(userId: string): Promise<void> {
        await this.usersRepository.update(userId, { deletedAt: undefined });
    }

    async logActivity(
        userId: string,
        action: string,
        metadata?: Record<string, any>,
        ipAddress?: string,
        userAgent?: string
    ): Promise<UserActivity> {
        const activity = this.activityRepository.create({
            userId,
            action,
            metadata,
            ipAddress,
            userAgent,
        });
        return this.activityRepository.save(activity);
    }

    async getActivityHistory(userId: string, page: number = 1, limit: number = 20): Promise<any> {
        const skip = (page - 1) * limit;

        const [activities, total] = await this.activityRepository.findAndCount({
            where: { userId },
            order: { createdAt: 'DESC' },
            skip,
            take: limit,
        });

        return {
            data: activities,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            }
        };
    }
}

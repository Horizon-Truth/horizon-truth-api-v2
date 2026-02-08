import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
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
}

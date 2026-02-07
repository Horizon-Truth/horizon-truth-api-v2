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
}

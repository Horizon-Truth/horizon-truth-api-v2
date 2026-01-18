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
            select: ['id', 'email', 'password', 'name', 'role', 'apiKey'], // explicitly select password for auth
        });
    }

    async findOneByApiKey(apiKey: string): Promise<User | null> {
        return this.usersRepository.findOne({ where: { apiKey } });
    }

    async create(userData: Partial<User>): Promise<User> {
        if (!userData.password) {
            throw new Error('Password is required');
        }
        const passwordHash = await bcrypt.hash(userData.password, 10);
        const user = this.usersRepository.create({
            ...userData,
            password: passwordHash,
            apiKey: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        } as any);
        return this.usersRepository.save(user) as unknown as Promise<User>;
    }
}

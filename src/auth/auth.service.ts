import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
    ) { }

    async validateUser(emailOrUsername: string, pass: string): Promise<any> {
        let user = await this.usersService.findOneByEmail(emailOrUsername);
        if (!user) {
            user = await this.usersService.findOneByUsername(emailOrUsername);
        }

        if (user && user.passwordHash && await bcrypt.compare(pass, user.passwordHash)) {
            const { passwordHash, ...result } = user;
            return result;
        }
        return null;
    }

    async login(user: any) {
        const payload = {
            email: user.email,
            username: user.username,
            sub: user.id,
            role: user.role
        };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                fullName: user.fullName,
                role: user.role,
                apiKey: user.apiKey,
            },
        };
    }

    async validateApiKey(apiKey: string): Promise<any> {
        const user = await this.usersService.findOneByApiKey(apiKey);
        if (user) {
            return user;
        }
        return null;
    }
}

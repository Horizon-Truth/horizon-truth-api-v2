import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { Session } from './entities/session.entity';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private configService: ConfigService,
        @InjectRepository(Session)
        private sessionRepository: Repository<Session>,
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

    async login(user: any, ipAddress?: string, userAgent?: string) {
        const payload = {
            email: user.email,
            username: user.username,
            sub: user.id,
            role: user.role
        };
        const tokens = await this.getTokens(user.id, user.username, user.role);
        await this.updateRefreshToken(user.id, tokens.refresh_token);

        // Create session
        await this.createSession(user.id, tokens.refresh_token, ipAddress, userAgent);

        return tokens;
    }

    async logout(userId: string, refreshToken?: string) {
        // If refresh token provided, delete specific session
        if (refreshToken) {
            await this.deleteSessionByToken(userId, refreshToken);
        } else {
            // Otherwise delete all sessions for user
            await this.deleteAllUserSessions(userId);
        }
        return this.usersService.update(userId, { hashedRefreshToken: null });
    }

    async refreshTokens(userId: string, refreshToken: string, ipAddress?: string, userAgent?: string) {
        const user = await this.usersService.findByIdWithRefreshToken(userId);
        if (!user || !user.hashedRefreshToken)
            throw new UnauthorizedException('Access Denied');

        const refreshTokenMatches = await bcrypt.compare(refreshToken, user.hashedRefreshToken);
        if (!refreshTokenMatches)
            throw new UnauthorizedException('Access Denied');

        // Validate session exists and is active
        const session = await this.validateSession(userId, refreshToken);
        if (!session) {
            throw new UnauthorizedException('Session expired or invalid');
        }

        const tokens = await this.getTokens(user.id, user.username!, user.role);
        await this.updateRefreshToken(user.id, tokens.refresh_token);

        // Update session with new refresh token
        await this.updateSession(session.id, tokens.refresh_token);

        return tokens;
    }

    async getTokens(userId: string, username: string, role: string) {
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(
                {
                    sub: userId,
                    username,
                    role,
                },
                {
                    secret: this.configService.get<string>('JWT_SECRET') || 'secretKey',
                    expiresIn: '15m',
                },
            ),
            this.jwtService.signAsync(
                {
                    sub: userId,
                    username,
                    role,
                },
                {
                    secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'refreshSecretKey',
                    expiresIn: '7d',
                },
            ),
        ]);

        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            user: { userId, username, role }
        };
    }

    async updateRefreshToken(userId: string, refreshToken: string) {
        const hash = await bcrypt.hash(refreshToken, 10);
        await this.usersService.update(userId, { hashedRefreshToken: hash });
    }

    async forgotPassword(email: string) {
        const user = await this.usersService.findOneByEmail(email);
        if (!user) return; // Don't reveal user existence

        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const expires = new Date();
        expires.setHours(expires.getHours() + 1);

        await this.usersService.update(user.id, {
            resetPasswordToken: token,
            resetPasswordExpires: expires
        });

        // Mock email sending
        console.log(`[Email Service] Password reset token for ${email}: ${token}`);
        return { message: 'If user exists, reset email sent' };
    }

    async resetPassword(token: string, newPassword: string) {
        const user = await this.usersService.findOneByResetToken(token);
        if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) { // Check expires exists
            throw new UnauthorizedException('Invalid or expired token');
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await this.usersService.update(user.id, {
            passwordHash,
            resetPasswordToken: null,
            resetPasswordExpires: null
        });

        return { message: 'Password reset successful' };
    }

    async validateApiKey(apiKey: string): Promise<any> {
        const user = await this.usersService.findOneByApiKey(apiKey);
        if (user) {
            return user;
        }
        return null;
    }

    // Session Management Methods

    async createSession(
        userId: string,
        refreshToken: string,
        ipAddress?: string,
        userAgent?: string
    ): Promise<Session> {
        const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

        const session = this.sessionRepository.create({
            userId,
            refreshTokenHash,
            ipAddress,
            userAgent,
            expiresAt,
            isActive: true,
        });

        return this.sessionRepository.save(session);
    }

    async validateSession(userId: string, refreshToken: string): Promise<Session | null> {
        const sessions = await this.sessionRepository.find({
            where: {
                userId,
                isActive: true,
                expiresAt: MoreThan(new Date()),
            },
            select: ['id', 'userId', 'refreshTokenHash', 'ipAddress', 'userAgent', 'expiresAt', 'createdAt', 'isActive'],
        });

        for (const session of sessions) {
            // Add null check before comparing
            if (session.refreshTokenHash && refreshToken) {
                const matches = await bcrypt.compare(refreshToken, session.refreshTokenHash);
                if (matches) {
                    return session;
                }
            }
        }

        return null;
    }

    async updateSession(sessionId: string, newRefreshToken: string): Promise<void> {
        const refreshTokenHash = await bcrypt.hash(newRefreshToken, 10);
        await this.sessionRepository.update(sessionId, { refreshTokenHash });
    }

    async getUserSessions(userId: string): Promise<Session[]> {
        return this.sessionRepository.find({
            where: {
                userId,
                isActive: true,
                expiresAt: MoreThan(new Date()),
            },
            order: { createdAt: 'DESC' },
        });
    }

    async revokeSession(userId: string, sessionId: string): Promise<void> {
        const session = await this.sessionRepository.findOne({
            where: { id: sessionId, userId },
        });

        if (!session) {
            throw new NotFoundException('Session not found');
        }

        await this.sessionRepository.update(sessionId, { isActive: false });
    }

    async revokeAllSessions(userId: string): Promise<void> {
        await this.sessionRepository.update(
            { userId, isActive: true },
            { isActive: false }
        );
    }

    async deleteSessionByToken(userId: string, refreshToken: string): Promise<void> {
        const session = await this.validateSession(userId, refreshToken);
        if (session) {
            await this.sessionRepository.update(session.id, { isActive: false });
        }
    }

    async deleteAllUserSessions(userId: string): Promise<void> {
        await this.sessionRepository.delete({ userId });
    }
}

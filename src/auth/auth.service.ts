import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { Session } from './entities/session.entity';
import { assertStrongPassword } from '../shared/utils/password-policy.util';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
  ) {}

  async validateUser(emailOrUsername: string, pass: string): Promise<any> {
    let user = await this.usersService.findOneByEmail(emailOrUsername);
    if (!user) {
      user = await this.usersService.findOneByUsername(emailOrUsername);
    }

    if (
      user &&
      user.passwordHash &&
      (await bcrypt.compare(pass, user.passwordHash))
    ) {
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
      role: user.role,
    };
    const tokens = await this.getTokens(user);
    await this.updateRefreshToken(user.id, tokens.refresh_token);

    // Create session
    await this.createSession(
      user.id,
      tokens.refresh_token,
      ipAddress,
      userAgent,
    );

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

  async refreshTokens(
    userId: string,
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.usersService.findByIdWithRefreshToken(userId);
    if (!user || !user.hashedRefreshToken)
      throw new UnauthorizedException('Access Denied');

    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.hashedRefreshToken,
    );
    if (!refreshTokenMatches) throw new UnauthorizedException('Access Denied');

    // Validate session exists and is active
    const session = await this.validateSession(userId, refreshToken);
    if (!session) {
      throw new UnauthorizedException('Session expired or invalid');
    }

    const tokens = await this.getTokens(user);
    await this.updateRefreshToken(user.id, tokens.refresh_token);

    // Update session with new refresh token
    await this.updateSession(session.id, tokens.refresh_token);

    return tokens;
  }

  async getTokens(user: any) {
    const { id: userId, username, role, fullName, playerProfile } = user;
    const avatarUrl = playerProfile?.avatar?.imageUrl;
    const nickname = playerProfile?.nickname;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          username,
          avatarUrl,
          nickname,
          fullName,
        },
        {
          algorithm: 'HS256',
          secret: this.configService.getOrThrow<string>('JWT_SECRET'),
          expiresIn: '7d',
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          username,
        },
        {
          algorithm: 'HS256',
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
          expiresIn: '7d',
        },
      ),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        userId,
        username,
        role,
        fullName,
        avatarUrl,
        nickname,
        onboardingCompleted: user?.playerProfile?.onboardingCompleted,
      },
    };
  }

  async updateRefreshToken(userId: string, refreshToken: string) {
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.usersService.update(userId, { hashedRefreshToken: hash });
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      // Don't reveal whether the user exists
      return { message: 'If user exists, reset email sent' };
    }

    // Generate a cryptographically-secure token and hash it for storage
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const expires = new Date();
    expires.setHours(expires.getHours() + 1);

    await this.usersService.update(user.id, {
      resetPasswordToken: tokenHash,
      resetPasswordExpires: expires,
    });

    // Build the reset link — falls back to a generic message if FRONTEND_URL is not set
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://horizontruth.org';
    const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;

    try {
      await this.mailService.send({
        to: email,
        subject: 'Reset your Horizon Truth password',
        text: `Click the link to reset your password (expires in 1 hour):\n\n${resetLink}\n\nIf you didn't request this, ignore this email.`,
        html: `<p>Click the link below to reset your password (expires in 1 hour):</p><p><a href="${resetLink}">Reset password</a></p><p>If you didn't request this, ignore this email.</p>`,
      });
    } catch (err) {
      this.logger.error(
        `Failed to send reset email to ${email}: ${(err as Error).message}`,
      );
      // Still return the same message so the email's existence isn't leaked
      return { message: 'If user exists, reset email sent' };
    }

    return { message: 'If user exists, reset email sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.usersService.findOneByResetToken(token);
    if (
      !user ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires < new Date()
    ) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Verify the raw token against the stored hash
    const tokenMatches = await bcrypt.compare(
      token,
      user.resetPasswordToken!,
    );
    if (!tokenMatches) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    assertStrongPassword(newPassword, { email: user.email ?? undefined });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersService.update(user.id, {
      passwordHash,
      resetPasswordToken: null,
      resetPasswordExpires: null,
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
    userAgent?: string,
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

  async validateSession(
    userId: string,
    refreshToken: string,
  ): Promise<Session | null> {
    const sessions = await this.sessionRepository.find({
      where: {
        userId,
        isActive: true,
        expiresAt: MoreThan(new Date()),
      },
      select: [
        'id',
        'userId',
        'refreshTokenHash',
        'ipAddress',
        'userAgent',
        'expiresAt',
        'createdAt',
        'isActive',
      ],
    });

    for (const session of sessions) {
      // Add null check before comparing
      if (session.refreshTokenHash && refreshToken) {
        const matches = await bcrypt.compare(
          refreshToken,
          session.refreshTokenHash,
        );
        if (matches) {
          return session;
        }
      }
    }

    return null;
  }

  async updateSession(
    sessionId: string,
    newRefreshToken: string,
  ): Promise<void> {
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
      { isActive: false },
    );
  }

  async deleteSessionByToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const session = await this.validateSession(userId, refreshToken);
    if (session) {
      await this.sessionRepository.update(session.id, { isActive: false });
    }
  }

  async deleteAllUserSessions(userId: string): Promise<void> {
    await this.sessionRepository.delete({ userId });
  }
}

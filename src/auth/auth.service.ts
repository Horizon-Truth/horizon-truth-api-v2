import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
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
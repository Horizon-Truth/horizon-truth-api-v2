import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Session } from './entities/session.entity';
import * as bcrypt from 'bcrypt';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AccountLifecycleService } from '../users/account-lifecycle.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let sessionRepository: any;

  const mockUsersService = {
    findOneByEmail: jest.fn(),
    findOneByUsername: jest.fn(),
    update: jest.fn(),
    logActivity: jest.fn(),
  };

  const mockAccountLifecycle = {
    markActive: jest.fn(),
    restore: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockSessionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: AccountLifecycleService, useValue: mockAccountLifecycle },
        { provide: MailService, useValue: { send: () => Promise.resolve() } },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        {
          provide: ConfigService,
          useValue: { get: () => 'secret', getOrThrow: (k) => 'secret' },
        },
        {
          provide: getRepositoryToken(Session),
          useValue: mockSessionRepository,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    sessionRepository = module.get(getRepositoryToken(Session));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user without password hash if validation succeeds', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        passwordHash: 'hashed',
      };
      mockUsersService.findOneByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toEqual({ id: '1', email: 'test@example.com' });
      expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hashed');
    });

    it('should return null if user is not found', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(null);
      mockUsersService.findOneByUsername.mockResolvedValue(null);

      const result = await service.validateUser('none@example.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null if password does not match', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        passwordHash: 'hashed',
      };
      mockUsersService.findOneByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test@example.com', 'wrong');

      expect(result).toBeNull();
    });
  });

  describe('getTokens', () => {
    it('should return access and refresh tokens', async () => {
      const user = {
        id: '1',
        username: 'test',
        role: 'PLAYER',
        fullName: 'Test User',
        playerProfile: { onboardingCompleted: true },
      };
      mockJwtService.signAsync.mockResolvedValue('token');
      mockConfigService.get.mockReturnValue('secret');

      const result = await service.getTokens(user);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result.user.userId).toBe('1');
      expect(result.user.onboardingCompleted).toBe(true);
    });
  });

  describe('validateSession', () => {
    it('should return session if refresh token matches', async () => {
      const sessions = [
        {
          id: 's1',
          userId: '1',
          refreshTokenHash: 'hashedToken',
          isActive: true,
          expiresAt: new Date(Date.now() + 10000),
        },
      ];
      sessionRepository.find.mockResolvedValue(sessions);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateSession('1', 'refreshToken');

      expect(result).toBeDefined();
      expect(result?.id).toBe('s1');
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'refreshToken',
        'hashedToken',
      );
    });

    it('should return null if no active session matches', async () => {
      sessionRepository.find.mockResolvedValue([]);
      const result = await service.validateSession('1', 'refreshToken');
      expect(result).toBeNull();
    });
  });

  describe('account pending deletion', () => {
    const pendingUser = {
      id: '1',
      email: 'test@example.com',
      passwordHash: 'hashed',
      deletedAt: new Date('2026-09-01'),
      deletionScheduledAt: new Date('2026-10-01'),
    };

    beforeEach(() => {
      jest.clearAllMocks();
      mockJwtService.signAsync.mockResolvedValue('token');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hash');
      mockSessionRepository.create.mockImplementation((x) => x);
    });

    it('refuses login with a code the client can act on', async () => {
      const { passwordHash, ...user } = pendingUser;

      const attempt = service.login(user);

      await expect(attempt).rejects.toBeInstanceOf(ForbiddenException);
      await expect(attempt).rejects.toMatchObject({
        response: {
          code: 'ACCOUNT_PENDING_DELETION',
          details: { deletionScheduledAt: pendingUser.deletionScheduledAt },
        },
      });
      expect(mockSessionRepository.save).not.toHaveBeenCalled();
    });

    it('records the login and activity on a normal sign-in', async () => {
      await service.login({ id: '2', email: 'a@b.c' });

      expect(mockAccountLifecycle.markActive).toHaveBeenCalledWith('2', {
        login: true,
      });
    });

    it('restores the account and signs in with valid credentials', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(pendingUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.restoreAccount('test@example.com', 'pw');

      expect(mockAccountLifecycle.restore).toHaveBeenCalledWith('1');
      expect(result).toHaveProperty('access_token');
    });

    it('does not restore with the wrong password', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(pendingUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.restoreAccount('test@example.com', 'wrong'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(mockAccountLifecycle.restore).not.toHaveBeenCalled();
    });
  });
});

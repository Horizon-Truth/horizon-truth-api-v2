import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { AccountLifecycleService } from '../../users/account-lifecycle.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    private accountLifecycle: AccountLifecycleService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      // Reject any token whose header `alg` is not HS256.
      // Without this, an attacker can forge a token with `alg: none`
      // or try an algorithm-confusion attack.
      algorithms: ['HS256'],
    });
  }

  async validate(payload: any) {
    const user = await this.usersService.findById(payload.sub);
    // Accounts pending deletion are locked out until restored.
    if (!user || user.deletedAt) return null;

    // Throttled to one write per hour; not awaited so it never slows or fails
    // the request.
    if (this.accountLifecycle.needsActivityUpdate(user)) {
      this.accountLifecycle
        .markActive(user.id)
        .catch((err) =>
          this.logger.warn(
            `Could not record activity for ${user.id}: ${(err as Error).message}`,
          ),
        );
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      onboardingCompleted: user.playerProfile?.onboardingCompleted || false,
    };
  }
}

import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
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
    if (!user) return null;

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      onboardingCompleted: user.playerProfile?.onboardingCompleted || false,
    };
  }
}

import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
    constructor(
        private configService: ConfigService,
        private usersService: UsersService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: configService.get<string>('JWT_REFRESH_SECRET') || 'refreshSecretKey',
            passReqToCallback: true,
        });
    }

    async validate(req: Request, payload: any) {
        const authHeader = req.get('Authorization');
        if (!authHeader) throw new UnauthorizedException('Refresh token missing');

        const refreshToken = authHeader.replace('Bearer', '').trim();
        // Validate refresh token exists in DB and matches
        // This logic should ideally be in AuthService or UsersService, but for strategy validation:
        return {
            ...payload,
            userId: payload.sub,
            refreshToken
        };
    }
}


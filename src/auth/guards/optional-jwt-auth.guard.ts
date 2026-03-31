import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
    handleRequest(err, user, info) {
        // Return the user if authenticated, otherwise return null (don't throw UnauthorizedException)
        return user || null;
    }
}

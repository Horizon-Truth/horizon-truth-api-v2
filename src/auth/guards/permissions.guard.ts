import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import {
  ModerationPermission,
  roleHasPermission,
} from '../../shared/enums/moderation-permission.enum';

/**
 * Enforces `@RequirePermissions(...)`. Runs after `JwtAuthGuard`, so
 * `request.user` is already populated by `JwtStrategy.validate`.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<ModerationPermission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) {
      return true;
    }

    const user = context.switchToHttp().getRequest().user;
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const missing = required.filter((p) => !roleHasPermission(user.role, p));
    if (missing.length > 0) {
      throw new ForbiddenException(
        `Access denied. Missing permission(s): ${missing.join(', ')}`,
      );
    }

    return true;
  }
}

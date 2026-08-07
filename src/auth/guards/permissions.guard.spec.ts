import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { ModerationPermission } from '../../shared/enums/moderation-permission.enum';
import { UserRole } from '../../shared/enums/user-role.enum';

function contextFor(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  let reflector: Reflector;
  let guard: PermissionsGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PermissionsGuard(reflector);
  });

  function requires(...permissions: ModerationPermission[]) {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(permissions.length ? permissions : undefined);
  }

  it('allows a route that declares no permissions', () => {
    requires();

    expect(guard.canActivate(contextFor({ role: UserRole.PLAYER }))).toBe(true);
  });

  it('allows a role holding the required permission', () => {
    requires(ModerationPermission.REVIEW_REPORTS);

    expect(
      guard.canActivate(contextFor({ userId: 'm', role: UserRole.MODERATOR })),
    ).toBe(true);
  });

  it('rejects a role without the permission', () => {
    requires(ModerationPermission.BAN_USERS);

    expect(() =>
      guard.canActivate(contextFor({ userId: 'm', role: UserRole.MODERATOR })),
    ).toThrow(ForbiddenException);
  });

  it('names the missing permission in the error, for debuggability', () => {
    requires(ModerationPermission.DELETE_CONTENT);

    expect(() =>
      guard.canActivate(contextFor({ userId: 'm', role: UserRole.MODERATOR })),
    ).toThrow(/moderation:delete_content/);
  });

  it('requires every listed permission, not merely one of them', () => {
    // A moderator holds REVIEW_REPORTS but not BAN_USERS.
    requires(
      ModerationPermission.REVIEW_REPORTS,
      ModerationPermission.BAN_USERS,
    );

    expect(() =>
      guard.canActivate(contextFor({ userId: 'm', role: UserRole.MODERATOR })),
    ).toThrow(ForbiddenException);
  });

  it('rejects an unauthenticated request', () => {
    requires(ModerationPermission.REVIEW_REPORTS);

    expect(() => guard.canActivate(contextFor(undefined))).toThrow(
      'User not authenticated',
    );
  });

  it('rejects a user whose role is absent or unrecognised', () => {
    requires(ModerationPermission.VIEW_DASHBOARD);

    expect(() =>
      guard.canActivate(contextFor({ userId: 'x', role: 'GHOST_ROLE' })),
    ).toThrow(ForbiddenException);
  });
});

import { UserRole } from './user-role.enum';
import {
  ModerationPermission,
  ROLE_PERMISSIONS,
  permissionsForRole,
  roleHasPermission,
} from './moderation-permission.enum';

/**
 * The permission matrix is the whole of the moderation authorisation policy,
 * so it is tested as a specification rather than incidentally through the
 * endpoints that consume it.
 */
describe('Moderation permission matrix', () => {
  describe('PLAYER', () => {
    it('holds no moderation capability at all', () => {
      expect(ROLE_PERMISSIONS[UserRole.PLAYER]).toEqual([]);
    });

    it.each(Object.values(ModerationPermission))(
      'is denied %s',
      (permission) => {
        expect(roleHasPermission(UserRole.PLAYER, permission)).toBe(false);
      },
    );
  });

  describe('MODERATOR', () => {
    it('can triage: view, review, assign, flag, hide and warn', () => {
      const allowed = [
        ModerationPermission.VIEW_DASHBOARD,
        ModerationPermission.REVIEW_REPORTS,
        ModerationPermission.ASSIGN_REPORTS,
        ModerationPermission.FLAG_CONTENT,
        ModerationPermission.HIDE_CONTENT,
        ModerationPermission.WARN_USERS,
        ModerationPermission.VIEW_ANALYTICS,
      ];

      for (const permission of allowed) {
        expect(roleHasPermission(UserRole.MODERATOR, permission)).toBe(true);
      }
    });

    it.each([
      ModerationPermission.DELETE_CONTENT,
      ModerationPermission.SUSPEND_USERS,
      ModerationPermission.BAN_USERS,
      ModerationPermission.REVIEW_APPEALS,
      ModerationPermission.MANAGE_FLAGS,
      ModerationPermission.MANAGE_MODERATORS,
      ModerationPermission.VIEW_AUDIT,
      ModerationPermission.EXPORT_DATA,
      ModerationPermission.ASSIGN_OTHERS,
    ])('cannot %s — that is a senior capability', (permission) => {
      expect(roleHasPermission(UserRole.MODERATOR, permission)).toBe(false);
    });
  });

  describe('SENIOR_MODERATOR', () => {
    it('adds deletion, suspension, appeals, audit and export', () => {
      const allowed = [
        ModerationPermission.DELETE_CONTENT,
        ModerationPermission.RESTORE_CONTENT,
        ModerationPermission.SUSPEND_USERS,
        ModerationPermission.RESTORE_USERS,
        ModerationPermission.REVIEW_APPEALS,
        ModerationPermission.VIEW_AUDIT,
        ModerationPermission.EXPORT_DATA,
        ModerationPermission.ASSIGN_OTHERS,
      ];

      for (const permission of allowed) {
        expect(roleHasPermission(UserRole.SENIOR_MODERATOR, permission)).toBe(
          true,
        );
      }
    });

    it('still cannot ban, manage flags or manage moderators', () => {
      expect(
        roleHasPermission(
          UserRole.SENIOR_MODERATOR,
          ModerationPermission.BAN_USERS,
        ),
      ).toBe(false);
      expect(
        roleHasPermission(
          UserRole.SENIOR_MODERATOR,
          ModerationPermission.MANAGE_FLAGS,
        ),
      ).toBe(false);
      expect(
        roleHasPermission(
          UserRole.SENIOR_MODERATOR,
          ModerationPermission.MANAGE_MODERATORS,
        ),
      ).toBe(false);
    });
  });

  describe('ORG_ADMIN', () => {
    it('gains banning, flag management and moderator management', () => {
      for (const permission of [
        ModerationPermission.BAN_USERS,
        ModerationPermission.MANAGE_FLAGS,
        ModerationPermission.MANAGE_MODERATORS,
      ]) {
        expect(roleHasPermission(UserRole.ORG_ADMIN, permission)).toBe(true);
      }
    });
  });

  describe('SYSTEM_ADMIN', () => {
    it('holds every capability, including any added later', () => {
      for (const permission of Object.values(ModerationPermission)) {
        expect(roleHasPermission(UserRole.SYSTEM_ADMIN, permission)).toBe(true);
      }
    });
  });

  describe('monotonicity', () => {
    // A senior role must never hold *fewer* capabilities than a junior one:
    // that would make escalation a downgrade.
    const ladder = [
      UserRole.PLAYER,
      UserRole.MODERATOR,
      UserRole.SENIOR_MODERATOR,
      UserRole.ORG_ADMIN,
      UserRole.SYSTEM_ADMIN,
    ];

    it.each(
      ladder.slice(0, -1).map((role, i) => [role, ladder[i + 1]] as const),
    )('%s permissions are a subset of %s', (junior, senior) => {
      const seniorSet = new Set(permissionsForRole(senior));
      for (const permission of permissionsForRole(junior)) {
        expect(seniorSet.has(permission)).toBe(true);
      }
    });
  });

  describe('roleHasPermission', () => {
    it('denies an absent role rather than throwing', () => {
      expect(
        roleHasPermission(undefined, ModerationPermission.VIEW_DASHBOARD),
      ).toBe(false);
      expect(roleHasPermission(null, ModerationPermission.VIEW_DASHBOARD)).toBe(
        false,
      );
    });
  });

  describe('permissionsForRole', () => {
    it('returns a copy, so a caller cannot mutate the policy', () => {
      const permissions = permissionsForRole(UserRole.MODERATOR);
      permissions.push(ModerationPermission.BAN_USERS);

      expect(
        roleHasPermission(UserRole.MODERATOR, ModerationPermission.BAN_USERS),
      ).toBe(false);
    });
  });
});

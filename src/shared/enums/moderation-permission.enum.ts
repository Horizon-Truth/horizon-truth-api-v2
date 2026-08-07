import { UserRole } from './user-role.enum';

/**
 * Fine-grained moderation capabilities.
 *
 * Endpoints declare the capability they need with `@RequirePermissions(...)`
 * rather than listing roles, so the role→capability mapping below is the
 * single place the policy is defined.
 */
export enum ModerationPermission {
  VIEW_DASHBOARD = 'moderation:view_dashboard',
  REVIEW_REPORTS = 'moderation:review_reports',
  ASSIGN_REPORTS = 'moderation:assign_reports',
  /** Assign a case to someone *other* than yourself. */
  ASSIGN_OTHERS = 'moderation:assign_others',
  FLAG_CONTENT = 'moderation:flag_content',
  HIDE_CONTENT = 'moderation:hide_content',
  DELETE_CONTENT = 'moderation:delete_content',
  RESTORE_CONTENT = 'moderation:restore_content',
  WARN_USERS = 'moderation:warn_users',
  SUSPEND_USERS = 'moderation:suspend_users',
  /** Permanent suspensions and bans. */
  BAN_USERS = 'moderation:ban_users',
  RESTORE_USERS = 'moderation:restore_users',
  MANAGE_FLAGS = 'moderation:manage_flags',
  REVIEW_APPEALS = 'moderation:review_appeals',
  VIEW_ANALYTICS = 'moderation:view_analytics',
  VIEW_AUDIT = 'moderation:view_audit',
  EXPORT_DATA = 'moderation:export_data',
  MANAGE_MODERATORS = 'moderation:manage_moderators',
}

const MODERATOR_PERMISSIONS: ModerationPermission[] = [
  ModerationPermission.VIEW_DASHBOARD,
  ModerationPermission.REVIEW_REPORTS,
  ModerationPermission.ASSIGN_REPORTS,
  ModerationPermission.FLAG_CONTENT,
  ModerationPermission.HIDE_CONTENT,
  ModerationPermission.WARN_USERS,
  ModerationPermission.VIEW_ANALYTICS,
];

const SENIOR_MODERATOR_PERMISSIONS: ModerationPermission[] = [
  ...MODERATOR_PERMISSIONS,
  ModerationPermission.ASSIGN_OTHERS,
  ModerationPermission.DELETE_CONTENT,
  ModerationPermission.RESTORE_CONTENT,
  ModerationPermission.SUSPEND_USERS,
  ModerationPermission.RESTORE_USERS,
  ModerationPermission.REVIEW_APPEALS,
  ModerationPermission.VIEW_AUDIT,
  ModerationPermission.EXPORT_DATA,
];

const ORG_ADMIN_PERMISSIONS: ModerationPermission[] = [
  ...SENIOR_MODERATOR_PERMISSIONS,
  ModerationPermission.BAN_USERS,
  ModerationPermission.MANAGE_FLAGS,
  ModerationPermission.MANAGE_MODERATORS,
];

/**
 * Role → capability map. SYSTEM_ADMIN holds every capability by construction
 * so a new permission is never accidentally withheld from the root role.
 */
export const ROLE_PERMISSIONS: Record<UserRole, ModerationPermission[]> = {
  [UserRole.PLAYER]: [],
  [UserRole.MODERATOR]: MODERATOR_PERMISSIONS,
  [UserRole.SENIOR_MODERATOR]: SENIOR_MODERATOR_PERMISSIONS,
  [UserRole.ORG_ADMIN]: ORG_ADMIN_PERMISSIONS,
  [UserRole.SYSTEM_ADMIN]: Object.values(ModerationPermission),
};

export function roleHasPermission(
  role: UserRole | undefined | null,
  permission: ModerationPermission,
): boolean {
  if (!role) return false;
  return (ROLE_PERMISSIONS[role] ?? []).includes(permission);
}

export function permissionsForRole(
  role: UserRole | undefined | null,
): ModerationPermission[] {
  if (!role) return [];
  return [...(ROLE_PERMISSIONS[role] ?? [])];
}

export enum UserRole {
  PLAYER = 'PLAYER',
  MODERATOR = 'MODERATOR',
  /**
   * Trusted moderator who handles escalations, permanent sanctions and
   * appeals. Sits between MODERATOR and ORG_ADMIN.
   */
  SENIOR_MODERATOR = 'SENIOR_MODERATOR',
  ORG_ADMIN = 'ORG_ADMIN',
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
}

/** Roles allowed anywhere in the moderation surface. */
export const MODERATION_ROLES: UserRole[] = [
  UserRole.MODERATOR,
  UserRole.SENIOR_MODERATOR,
  UserRole.ORG_ADMIN,
  UserRole.SYSTEM_ADMIN,
];

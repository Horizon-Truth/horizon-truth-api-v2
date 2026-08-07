/** Enforcement measures that can be applied to an account. */
export enum UserSanctionType {
  WARNING = 'WARNING',
  TEMPORARY_SUSPENSION = 'TEMPORARY_SUSPENSION',
  PERMANENT_SUSPENSION = 'PERMANENT_SUSPENSION',
  BAN = 'BAN',
}

export enum UserSanctionStatus {
  /** Currently in force. */
  ACTIVE = 'ACTIVE',
  /** Ran to its natural end (temporary suspensions only). */
  EXPIRED = 'EXPIRED',
  /** Lifted early by a moderator. */
  REVOKED = 'REVOKED',
  /** Lifted because an appeal succeeded. */
  OVERTURNED = 'OVERTURNED',
}

/**
 * Risk-score contribution per sanction type. Combined with flag weights and
 * upheld-report counts in `ModerationUsersService.computeRiskScore`.
 */
export const SANCTION_RISK_WEIGHT: Record<UserSanctionType, number> = {
  [UserSanctionType.WARNING]: 5,
  [UserSanctionType.TEMPORARY_SUSPENSION]: 15,
  [UserSanctionType.PERMANENT_SUSPENSION]: 40,
  [UserSanctionType.BAN]: 50,
};

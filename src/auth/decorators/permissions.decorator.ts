import { SetMetadata } from '@nestjs/common';
import { ModerationPermission } from '../../shared/enums/moderation-permission.enum';

export const PERMISSIONS_KEY = 'moderation_permissions';

/**
 * Declare the moderation capabilities an endpoint requires. All listed
 * permissions must be held (AND, not OR).
 *
 * Prefer this over `@Roles(...)` inside the moderation module so the policy
 * lives in one place (`ROLE_PERMISSIONS`) instead of being spread across
 * controllers.
 */
export const RequirePermissions = (...permissions: ModerationPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

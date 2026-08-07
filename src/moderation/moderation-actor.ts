import type { Request } from 'express';
import { UserRole } from '../shared/enums/user-role.enum';
import {
  ModerationPermission,
  roleHasPermission,
} from '../shared/enums/moderation-permission.enum';

/**
 * Who is performing a moderation action, and from where.
 *
 * Services take this rather than the raw `Request` so they stay testable and
 * so the IP/user-agent that end up in the audit trail are captured in exactly
 * one place (`actorFromRequest`).
 */
export interface ModerationActor {
  userId: string;
  role: UserRole;
  ipAddress?: string;
  userAgent?: string;
}

/** Build an actor from an authenticated request. */
export function actorFromRequest(req: Request): ModerationActor {
  const user = (req as Request & { user?: { userId: string; role: UserRole } })
    .user;

  return {
    userId: user?.userId as string,
    role: user?.role as UserRole,
    // `x-forwarded-for` is a comma-separated chain; the first entry is the
    // originating client when the proxy chain is trusted.
    ipAddress:
      firstForwardedFor(req.headers['x-forwarded-for']) ?? req.ip ?? undefined,
    userAgent: req.headers['user-agent'],
  };
}

export function actorCan(
  actor: ModerationActor,
  permission: ModerationPermission,
): boolean {
  return roleHasPermission(actor.role, permission);
}

function firstForwardedFor(
  header: string | string[] | undefined,
): string | undefined {
  if (!header) return undefined;
  const raw = Array.isArray(header) ? header[0] : header;
  const first = raw.split(',')[0]?.trim();
  return first || undefined;
}

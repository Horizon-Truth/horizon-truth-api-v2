import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';

import { User } from './entities/user.entity';
import { MailService } from '../mail/mail.service';

/** How long an invitation link stays usable. */
export const INVITE_EXPIRY_HOURS = 168; // 7 days

export interface InvitationResult {
  /** False when no mail provider is configured — the link is still valid. */
  sent: boolean;
  expiresAt: Date;
  /**
   * Returned so an administrator can hand the link over another channel when
   * email is not configured or bounces. Only ever returned to the
   * administrator who triggered the invitation, never logged.
   */
  link: string;
}

/**
 * Invitations for accounts an administrator creates on someone's behalf.
 *
 * Rather than inventing a credential and emailing it — which puts a working
 * password in an inbox forever — the invitee gets a single-use link and
 * chooses their own password. The link reuses the password-reset token
 * columns and the existing `POST /auth/reset-password` endpoint; only the
 * lifetime differs, because an invitation has to survive a weekend.
 */
@Injectable()
export class UserInvitationsService {
  private readonly logger = new Logger(UserInvitationsService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async invite(userId: string): Promise<InvitationResult> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const token = this.generateToken();
    const expiresAt = new Date(
      Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000,
    );

    await this.usersRepository.update(user.id, {
      resetPasswordToken: token,
      resetPasswordExpires: expiresAt,
    });

    const link = this.buildLink(token);

    if (!this.mail.isConfigured || !user.email) {
      // Not an error: the invitation exists and the link works. The caller
      // decides whether to hand it over by another channel.
      this.logger.warn(
        `Invitation for ${user.id} created but not emailed (mail configured: ${this.mail.isConfigured}).`,
      );
      return { sent: false, expiresAt, link };
    }

    await this.mail.send({
      to: user.email,
      subject: 'You have been invited to Horizon Truth',
      text: this.plainTextBody(user.fullName, link),
      html: this.htmlBody(user.fullName, link),
    });

    return { sent: true, expiresAt, link };
  }

  /**
   * 32 random bytes from the CSPRNG. `Math.random()` is not seeded securely
   * and its output is predictable from prior draws — for a token that grants
   * password control, that is an account-takeover primitive.
   */
  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  private buildLink(token: string): string {
    const base = (
      this.config.get<string>('APP_URL') ?? 'http://localhost:5173'
    ).replace(/\/+$/, '');

    return `${base}/set-password?token=${token}`;
  }

  private plainTextBody(fullName: string, link: string): string {
    return [
      `Hello ${fullName},`,
      '',
      'An account has been created for you on Horizon Truth.',
      'Choose your password using the link below, then sign in:',
      '',
      link,
      '',
      `This link expires in ${INVITE_EXPIRY_HOURS / 24} days and can be used once.`,
      'If you were not expecting this invitation, you can ignore this email.',
    ].join('\n');
  }

  private htmlBody(fullName: string, link: string): string {
    return `
      <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#111">
        <h1 style="font-size:20px;margin:0 0 16px">Welcome to Horizon Truth</h1>
        <p style="font-size:15px;line-height:1.6;margin:0 0 12px">Hello ${escapeHtml(fullName)},</p>
        <p style="font-size:15px;line-height:1.6;margin:0 0 24px">
          An account has been created for you. Choose your own password to finish setting it up.
        </p>
        <p style="margin:0 0 24px">
          <a href="${link}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 24px;border-radius:9999px;font-weight:700">
            Set your password
          </a>
        </p>
        <p style="font-size:13px;line-height:1.6;color:#666;margin:0 0 8px">
          This link expires in ${INVITE_EXPIRY_HOURS / 24} days and can be used once.
          If the button does not work, paste this into your browser:
        </p>
        <p style="font-size:12px;color:#666;word-break:break-all;margin:0">${link}</p>
      </div>
    `;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

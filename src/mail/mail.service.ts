import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import * as nodemailer from 'nodemailer';

export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

type MailProvider = 'resend' | 'smtp' | 'none';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly provider: MailProvider;
  private readonly resend: Resend | null = null;
  private readonly transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');

    if (resendApiKey) {
      this.resend = new Resend(resendApiKey);
      this.provider = 'resend';
      this.logger.log('Outgoing email enabled via Resend.');
      return;
    }

    // SMTP stays available as a fallback, mainly for local development
    // against a catcher like Mailhog.
    const host = this.configService.get<string>('SMTP_HOST');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASSWORD');

    if (host && user && pass) {
      const port = Number(this.configService.get<string>('SMTP_PORT') ?? 587);
      this.transporter = nodemailer.createTransport({
        host,
        port,
        // Port 465 is implicit TLS, everything else upgrades via STARTTLS.
        secure: port === 465,
        auth: { user, pass },
      });
      this.provider = 'smtp';
      this.logger.log(`Outgoing email enabled via SMTP (${host}:${port}).`);
      return;
    }

    this.provider = 'none';
    this.logger.warn(
      'No mail provider configured (set RESEND_API_KEY, or SMTP_HOST / SMTP_USER / SMTP_PASSWORD). Outgoing email is disabled.',
    );
  }

  get isConfigured(): boolean {
    return this.provider !== 'none';
  }

  async send(options: SendMailOptions): Promise<void> {
    if (this.provider === 'none') {
      throw new ServiceUnavailableException(
        'Email delivery is not configured on this server. Set RESEND_API_KEY in .env, then restart the server (--watch does not reload .env).',
      );
    }

    const from =
      this.configService.get<string>('MAIL_FROM') ??
      this.configService.get<string>('SMTP_USER');

    if (!from) {
      throw new ServiceUnavailableException(
        'No sender address is configured on this server. Set MAIL_FROM.',
      );
    }

    switch (this.provider) {
      case 'resend':
        await this.sendWithResend(from, options);
        break;
      case 'smtp':
        await this.sendWithSmtp(from, options);
        break;
    }

    this.logger.log(
      `Email sent to ${options.to} via ${this.provider} — "${options.subject}"`,
    );
  }

  private async sendWithResend(
    from: string,
    options: SendMailOptions,
  ): Promise<void> {
    // The SDK reports failures in the response body rather than throwing,
    // so both paths have to be handled.
    let error: { name?: string; message: string } | null;

    try {
      ({ error } = await this.resend!.emails.send({
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html ?? options.text,
        replyTo: options.replyTo,
      }));
    } catch (thrown) {
      this.logger.error(
        `Resend request to ${options.to} failed: ${(thrown as Error).message}`,
      );
      throw new ServiceUnavailableException(
        'The email could not be delivered. Please try again later.',
      );
    }

    if (error) {
      this.logger.error(
        `Resend rejected the email to ${options.to}: ${error.name ?? 'error'} — ${error.message}`,
      );
      throw new ServiceUnavailableException(
        `The email could not be delivered: ${error.message}`,
      );
    }
  }

  private async sendWithSmtp(
    from: string,
    options: SendMailOptions,
  ): Promise<void> {
    try {
      await this.transporter!.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        replyTo: options.replyTo,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${options.to}: ${(error as Error).message}`,
      );
      throw new ServiceUnavailableException(
        'The email could not be delivered. Please try again later.',
      );
    }
  }
}

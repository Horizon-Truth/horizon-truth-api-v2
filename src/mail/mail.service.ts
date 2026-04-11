import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
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
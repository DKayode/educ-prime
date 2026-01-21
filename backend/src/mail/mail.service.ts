import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
    private transporter: nodemailer.Transporter;
    private readonly logger = new Logger(MailService.name);

    constructor(private configService: ConfigService) {
        this.initTransporter();
    }

    private initTransporter() {
        const host = this.configService.get<string>('SMTP_HOST');
        const port = Number(this.configService.get<number>('SMTP_PORT'));
        const user = this.configService.get<string>('SMTP_USER');
        const pass = this.configService.get<string>('SMTP_PASS');
        const secure = this.configService.get<string>('SMTP_SECURE') === 'true';

        if (host && user && pass) {
            this.transporter = nodemailer.createTransport({
                host,
                port,
                secure, // true for 465, false for other ports
                auth: {
                    user,
                    pass,
                },
            });
            this.logger.log(`MailService initialized with host: ${host}`);
        } else {
            this.logger.error('SMTP configuration missing. Emails cannot be sent.');
        }
    }

    async sendResetCode(email: string, code: string) {
        if (!this.transporter) {
            throw new Error('SMTP configuration missing. Cannot send email.');
        }

        const from = this.configService.get<string>('SMTP_USER') || 'support@educ-prime.cloud';
        const mailOptions = {
            from: `"Edukia" <${from}>`,
            to: email,
            subject: 'Réinitialisation de votre mot de passe',
            html: `
        <h1>Réinitialisation de mot de passe</h1>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <p>Votre code de vérification est : <strong>${code}</strong></p>
        <p>Ce code expire dans 15 minutes.</p>
        <p>Si vous n'êtes pas à l'origine de cette demande, veuillez ignorer cet email.</p>
      `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            this.logger.log(`Reset code email sent to ${email}`);
        } catch (error) {
            this.logger.error(`Failed to send email to ${email}: ${error.message}`, error.stack);
            throw error;
        }
    }
}

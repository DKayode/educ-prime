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
        <br/>
        <p>L'équipe Edukia</p>
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

    async sendVerifyEmailCode(email: string, code: string) {
        if (!this.transporter) {
            throw new Error('SMTP configuration missing. Cannot send email.');
        }

        const from = this.configService.get<string>('SMTP_USER') || 'support@educ-prime.cloud';
        const mailOptions = {
            from: `"Edukia" <${from}>`,
            to: email,
            subject: 'Vérification de votre adresse email',
            html: `
        <h1>Vérification d'email</h1>
        <p>Votre code de vérification est : <strong>${code}</strong></p>
        <p>Ce code expire dans 1 jour.</p>
        <br/>
        <p>L'équipe Edukia</p>
      `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            this.logger.log(`Verification code email sent to ${email}`);
        } catch (error) {
            this.logger.error(`Failed to send email to ${email}: ${error.message}`, error.stack);
            throw new Error("Erreur lors de l'envoi de l'email");
        }
    }

    async sendServiceStatusUpdateEmail(email: string, userName: string, serviceTitle: string, status: string, entityType: string = 'service') {
        if (!this.transporter) {
            this.logger.warn(`SMTP configuration missing. Cannot send ${entityType} status email.`);
            return;
        }

        const from = this.configService.get<string>('SMTP_USER') || 'support@educ-prime.cloud';

        let statusText = '';
        let messageHtml = '';

        if (status === 'active' || status === 'approved') {
            statusText = 'approuvé';
            messageHtml = `<p>Excellente nouvelle ! Votre ${entityType} <strong>"${serviceTitle}"</strong> a été <strong>approuvé</strong> et est maintenant visible par tous les utilisateurs.</p>`;
        } else if (status === 'declined') {
            statusText = 'refusé';
            messageHtml = `<p>Nous sommes au regret de vous informer que votre ${entityType} <strong>"${serviceTitle}"</strong> a été <strong>refusé</strong> car il ne respectait pas nos conditions de publication.</p>`;
        } else {
            // Optional: don't send emails for other status changes
            return;
        }

        const mailOptions = {
            from: `"Edukia" <${from}>`,
            to: email,
            subject: `Mise à jour de votre ${entityType} : ${statusText}`,
            html: `
        <h1>Bonjour ${userName},</h1>
        ${messageHtml}
        <p>Merci pour votre confiance,</p>
        <p>L'équipe Edukia</p>
      `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            this.logger.log(`Service status update email sent to ${email}`);
        } catch (error) {
            this.logger.error(`Failed to send email to ${email}: ${error.message}`, error.stack);
            throw new Error("Erreur lors de l'envoi de l'email");
        }
    }

    async sendRecruteurStatusUpdateEmail(email: string, userName: string, status: string) {
        if (!this.transporter) {
            this.logger.warn('SMTP configuration missing. Cannot send recruteur status email.');
            return;
        }

        const from = this.configService.get<string>('SMTP_USER') || 'support@educ-prime.cloud';

        let statusText = '';
        let messageHtml = '';

        if (status === 'active' || status === 'approved') {
            statusText = 'approuvé';
            messageHtml = `
                <p>Félicitations ! Votre profil de <strong>Recruteur</strong> a été <strong>approuvé</strong>.</p>
                <p>Vous pouvez dès à présent vous connecter et commencer à publier des offres sur notre plateforme.</p>
            `;
        } else if (status === 'declined') {
            statusText = 'refusé';
            messageHtml = `
                <p>Nous sommes au regret de vous informer que votre profil de <strong>Recruteur</strong> a été <strong>refusé</strong>.</p>
                <p>Si vous pensez qu'il s'agit d'une erreur ou si vous souhaitez plus d'informations, n'hésitez pas à nous contacter.</p>
            `;
        } else {
            return;
        }

        const mailOptions = {
            from: `"Edukia" <${from}>`,
            to: email,
            subject: `Mise à jour de votre profil Recruteur : ${statusText}`,
            html: `
        <h1>Bonjour ${userName},</h1>
        ${messageHtml}
        <p>Merci pour votre confiance,</p>
        <p>L'équipe Edukia</p>
      `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            this.logger.log(`Recruteur status update email sent to ${email}`);
        } catch (error) {
            this.logger.error(`Failed to send email to ${email}: ${error.message}`, error.stack);
            throw new Error("Erreur lors de l'envoi de l'email");
        }
    }
}

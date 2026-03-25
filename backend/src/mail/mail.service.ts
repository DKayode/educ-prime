import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';

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
                pool: true, // Reuse connections
                maxConnections: 3, // Smaller pool for safety
                maxMessages: 100, // Max messages per connection before reconnecting
                rateDelta: 1000, // 1 second
                rateLimit: 1, // 1 email per second max (Extremely safe)
            });
            this.logger.log(`MailService initialized with host: ${host}`);
        } else {
            this.logger.error('SMTP configuration missing (host, user or pass). Emails cannot be sent.');
        }
    }

    private wrapHtmlTemplate(content: string, title: string = 'Edukia'): string {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f8; padding: 20px 0;">
                <tr>
                    <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin: 0 auto; min-width: 320px; max-width: 600px;">
                            <!-- Header -->
                            <tr>
                                <td style="padding: 24px; text-align: center; border-bottom: 3px solid #009a44; background-color: #ffffff;">
                                    <img src="cid:edukia-logo" alt="Edukia Logo" style="max-height: 40px; vertical-align: middle; margin-right: 12px; border: none;">
                                    <h1 style="display: inline-block; margin: 0; font-size: 28px; vertical-align: middle; font-weight: 800; letter-spacing: -0.5px;"><span style="color: #009a44;">EDU</span><span style="color: #000000;">KIA</span></h1>
                                </td>
                            </tr>
                            <!-- Content -->
                            <tr>
                                <td style="padding: 32px; color: #334155; font-size: 16px; line-height: 1.6;">
                                    ${content}
                                </td>
                            </tr>
                            <!-- Footer -->
                            <tr>
                                <td style="padding: 24px; text-align: center; font-size: 13px; color: #94a3b8; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
                                    &copy; ${new Date().getFullYear()} Edukia. Tous droits réservés.<br/>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        `;
    }

    async sendResetCode(email: string, code: string) {
        if (!this.transporter) {
            throw new Error('SMTP configuration missing. Cannot send email.');
        }

        const from = this.configService.get<string>('SMTP_USER') || 'support@educ-prime.cloud';
        const innerContent = `
        <h2 style="color: #0f172a; margin-top: 0;">Réinitialisation de mot de passe</h2>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <div style="background-color: #f1f5f9; padding: 16px; text-align: center; border-radius: 6px; margin: 24px 0;">
            <p style="margin: 0; font-size: 14px; color: #64748b;">Votre code de vérification est :</p>
            <p style="margin: 8px 0 0 0; font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #009a44;">${code}</p>
        </div>
        <p>Ce code expire dans <strong>15 minutes</strong>.</p>
        <p style="font-size: 14px; color: #64748b;">Si vous n'êtes pas à l'origine de cette demande, veuillez ignorer cet email et sécuriser votre compte.</p>
        <br/>
        <p>L'équipe Edukia</p>
        `;

        const mailOptions = {
            from: `"Edukia" <${from}>`,
            to: email,
            subject: 'Réinitialisation de votre mot de passe',
            html: this.wrapHtmlTemplate(innerContent, 'Réinitialisation de mot de passe'),
            attachments: [{
                filename: 'logo.png',
                path: path.join(process.cwd(), 'assets', 'logo.png'),
                cid: 'edukia-logo'
            }]
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
        const innerContent = `
        <h2 style="color: #0f172a; margin-top: 0;">Vérification d'email</h2>
        <p>Merci de vous être inscrit sur Edukia ! Voici votre code de vérification :</p>
        <div style="background-color: #f1f5f9; padding: 16px; text-align: center; border-radius: 6px; margin: 24px 0;">
            <p style="margin: 0; font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #009a44;">${code}</p>
        </div>
        <p>Ce code expire dans <strong>1 jour</strong>.</p>
        <br/>
        <p>L'équipe Edukia</p>
        `;

        const mailOptions = {
            from: `"Edukia" <${from}>`,
            to: email,
            subject: 'Vérification de votre adresse email',
            html: this.wrapHtmlTemplate(innerContent, 'Vérification d\'email'),
            attachments: [{
                filename: 'logo.png',
                path: path.join(process.cwd(), 'assets', 'logo.png'),
                cid: 'edukia-logo'
            }]
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
            messageHtml = `<p>Nous sommes au regret de vous informer que votre ${entityType} <strong>"${serviceTitle}"</strong> a été <strong>refusé</strong> car elle ne respectait pas nos conditions de publication.</p>`;
        } else {
            // Optional: don't send emails for other status changes
            return;
        }

        const innerContent = `
        <h2 style="color: #0f172a; margin-top: 0;">Bonjour ${userName},</h2>
        ${messageHtml}
        <br/>
        <p>Merci pour votre confiance,</p>
        <p>L'équipe Edukia</p>
        `;

        const mailOptions = {
            from: `"Edukia" <${from}>`,
            to: email,
            subject: `Mise à jour de votre ${entityType} : ${statusText}`,
            html: this.wrapHtmlTemplate(innerContent, `Mise à jour de ${entityType}`),
            attachments: [{
                filename: 'logo.png',
                path: path.join(process.cwd(), 'assets', 'logo.png'),
                cid: 'edukia-logo'
            }]
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            this.logger.log(`Service status update email sent to ${email}. MessageId: ${info.messageId}`);
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

        const innerContent = `
        <h2 style="color: #0f172a; margin-top: 0;">Bonjour ${userName},</h2>
        ${messageHtml}
        <br/>
        <p>Merci pour votre engagement,</p>
        <p>L'équipe Edukia</p>
        `;

        const mailOptions = {
            from: `"Edukia" <${from}>`,
            to: email,
            subject: `Mise à jour de votre profil Recruteur : ${statusText}`,
            html: this.wrapHtmlTemplate(innerContent, 'Mise à jour profil Recruteur'),
            attachments: [{
                filename: 'logo.png',
                path: path.join(process.cwd(), 'assets', 'logo.png'),
                cid: 'edukia-logo'
            }]
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            this.logger.log(`Recruteur status update email sent to ${email}. MessageId: ${info.messageId}`);
        } catch (error) {
            this.logger.error(`Failed to send email to ${email}: ${error.message}`, error.stack);
            throw new Error("Erreur lors de l'envoi de l'email");
        }
    }

    async sendPersonalizedEmail(email: string, subject: string, htmlMessage: string) {
        if (!this.transporter) {
            this.logger.warn('SMTP configuration missing. Cannot send personalized email.');
            return;
        }

        const from = this.configService.get<string>('SMTP_USER') || 'support@educ-prime.cloud';

        const mailOptions = {
            from: `"Edukia" <${from}>`,
            to: email, // Sending directly uniquely
            subject: subject,
            html: this.wrapHtmlTemplate(htmlMessage, subject),
            attachments: [{
                filename: 'logo.png',
                path: path.join(process.cwd(), 'assets', 'logo.png'),
                cid: 'edukia-logo'
            }]
        };

        try {
            this.logger.log(`SMTP: Attempting to send personalized email to ${email}`);
            await this.transporter.sendMail(mailOptions);
            this.logger.log(`SMTP: Successfully sent email to ${email}`);
        } catch (error) {
            this.logger.error(`Failed to send personalized email: ${error.message}`, error.stack);
            throw new Error("Erreur lors de l'envoi de l'email");
        }
    }
}

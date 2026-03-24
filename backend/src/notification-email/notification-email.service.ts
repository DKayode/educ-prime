import { Injectable, Logger } from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { SendEmailDto } from './dto/send-email.dto';

@Injectable()
export class NotificationEmailService {
  private readonly logger = new Logger(NotificationEmailService.name);

  constructor(
    private readonly mailService: MailService,
    private readonly prisma: PrismaService,
  ) { }

  async sendBroadcast(dto: SendEmailDto) {
    const targetUsers = await this.prisma.utilisateurs.findMany({
      where: {
        desabonnement_email: null,
        email: { not: '' }
      },
      select: { id: true, email: true, uuid: true }
    });

    const validUsers = targetUsers.filter(u => !!u.email && !!u.uuid);

    if (validUsers.length > 0) {
      this.logger.log(`Dispatching personalized broadcast emails to ${validUsers.length} users.`);
      const frontendUrl = process.env.FRONTEND_URL || 'https://educ-prime.cloud';

      const emailPromises = validUsers.map(user => {
        const unsubscribeHtml = `
          <br><br><br>
          <hr style="border: none; border-top: 1px solid #eaeaea;" />
          <div style="text-align: center; padding: 20px 0; font-family: sans-serif; font-size: 12px; color: #888;">
            Vous recevez cet email car vous êtes inscrit sur notre plateforme.<br>
            Pour ne plus recevoir ces notifications, vous pouvez 
            <a href="${frontendUrl}/desabonnement?uuid=${user.uuid}" style="color: #009a44; text-decoration: underline;">désabonner</a>.
          </div>
        `;
        const finalHtmlBody = dto.body + unsubscribeHtml;
        return this.mailService.sendPersonalizedEmail(user.email, dto.title, finalHtmlBody);
      });

      // Execute all concurrently
      await Promise.all(emailPromises);
      this.logger.log(`All ${validUsers.length} personalized emails dispatched successfully.`);
    } else {
      this.logger.log(`No valid subscribed users found for broadcast.`);
    }

    return {
      message: 'Broadcast personalized emails processed',
      recipientsCount: validUsers.length
    };
  }

  async unsubscribe(uuid: string) {
    const user = await this.prisma.utilisateurs.findUnique({
      where: { uuid: uuid }
    });

    if (!user || !user.uuid) {
      throw new Error("Utilisateur introuvable avec ce UUID.");
    }

    const existing = await this.prisma.desabonnement_email.findUnique({
      where: { utilisateur_uuid: user.uuid }
    });

    if (!existing) {
      await this.prisma.desabonnement_email.create({
        data: { utilisateur_uuid: user.uuid }
      });
      this.logger.log(`Utilisateur ${user.uuid} a été ajouté à la liste de désabonnement email.`);
    }

    return { message: 'Désabonnement réussi' };
  }
}

import { Module } from '@nestjs/common';
import { NotificationEmailController } from './notification-email.controller';
import { NotificationEmailService } from './notification-email.service';
import { MailModule } from '../mail/mail.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [MailModule, PrismaModule],
  controllers: [NotificationEmailController],
  providers: [NotificationEmailService],
})
export class NotificationEmailModule {}

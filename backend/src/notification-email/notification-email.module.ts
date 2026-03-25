import { Module } from '@nestjs/common';
import { NotificationEmailController } from './notification-email.controller';
import { NotificationEmailService } from './notification-email.service';
import { MailModule } from '../mail/mail.module';
import { PrismaModule } from '../prisma/prisma.module';
import { BullModule } from '@nestjs/bullmq';
import { EmailProcessor } from './email.processor';

@Module({
  imports: [
    MailModule,
    PrismaModule,
    BullModule.registerQueue({
      name: 'email',
    }),
  ],
  controllers: [NotificationEmailController],
  providers: [NotificationEmailService, EmailProcessor],
})
export class NotificationEmailModule {}

import { Controller, Post, Body, HttpCode, HttpStatus, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NotificationEmailService } from './notification-email.service';
import { SendEmailDto, UnsubscribeEmailDto } from './dto/send-email.dto';

@ApiTags('notification-email')
@Controller('notification-email')
@UsePipes(new ValidationPipe({ transform: true }))
export class NotificationEmailController {
  constructor(private readonly notificationEmailService: NotificationEmailService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Envoyer un email à tous les utilisateurs (sauf désabonnés)' })
  @ApiResponse({ status: 200, description: 'Email diffusé avec succès' })
  async sendNotificationEmail(@Body() dto: SendEmailDto) {
    return await this.notificationEmailService.sendBroadcast(dto);
  }

  @Post('unsubscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Désabonner un utilisateur des notifications email' })
  @ApiResponse({ status: 200, description: 'Désabonnement réussi' })
  async unsubscribe(@Body() dto: UnsubscribeEmailDto) {
    return await this.notificationEmailService.unsubscribe(dto.uuid);
  }
}

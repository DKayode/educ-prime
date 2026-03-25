import { Controller, Post, Body, HttpCode, HttpStatus, UsePipes, ValidationPipe, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { NotificationEmailService } from './notification-email.service';
import { SendEmailDto, UnsubscribeEmailDto } from './dto/send-email.dto';

@ApiTags('notification-email')
@Controller('notification-email')
@UsePipes(new ValidationPipe({ transform: true }))
export class NotificationEmailController {
  constructor(private readonly notificationEmailService: NotificationEmailService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lancer un envoi groupé d\'emails' })
  @ApiResponse({ status: 200, description: 'Le job de diffusion a été ajouté à la file d\'attente', schema: { example: { jobId: '123' } } })
  async sendNotificationEmail(@Body() dto: SendEmailDto) {
    return await this.notificationEmailService.sendBroadcast(dto);
  }

  @Get('status/:id')
  @ApiOperation({ summary: 'Suivre la progression d\'un envoi (Parent Job)' })
  @ApiParam({ name: 'id', description: 'ID du job parent (ex: result of POST /notification-email)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Statut détaillé incluant succès/échecs et quotas journaliers',
    schema: {
      example: {
        id: '6',
        name: 'prepare-broadcast',
        status: 'processing',
        sentCount: 45,
        failedCount: 2,
        totalCount: 500,
        dailyCount: 47,
        dailyLimit: 1000,
        progress: 9
      }
    }
  })
  async getStatus(@Param('id') id: string) {
    return await this.notificationEmailService.getJobStatus(id);
  }

  @Post('unsubscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Désabonner un utilisateur des notifications email' })
  @ApiResponse({ status: 200, description: 'Désabonnement réussi' })
  async unsubscribe(@Body() dto: UnsubscribeEmailDto) {
    return await this.notificationEmailService.unsubscribe(dto.uuid);
  }

  @Post('cancel/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Arrêter un envoi groupé en cours' })
  @ApiParam({ name: 'id', description: 'ID du job parent à arrêter' })
  @ApiResponse({ status: 200, description: 'Signal d\'arrêt envoyé avec succès' })
  async cancelJob(@Param('id') id: string) {
    return await this.notificationEmailService.cancelJob(id);
  }

  @Post('drain')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vider complètement la file d\'attente (Drain)' })
  @ApiResponse({ status: 200, description: 'File d\'attente vidée' })
  async drainQueue() {
    return await this.notificationEmailService.drainQueue();
  }
}

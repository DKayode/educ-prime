import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  Query,
  Get,
  Request
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import {
  SendNotificationDto,
  SubscribeTopicDto,
  ValidateTokenDto
} from './dto/send-notification.dto';
import { GetNotificationsQueryDto } from './dto/get-notifications-query.dto';

@ApiTags('notifications')
@Controller('notifications')
@UsePipes(new ValidationPipe({ transform: true }))
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) { }

  @Get()
  @ApiOperation({ summary: 'Récupérer les notifications' })
  @ApiResponse({ status: 200, description: 'Liste des notifications' })
  async getNotifications(
    @Request() req,
    @Query() query: GetNotificationsQueryDto,
  ) {
    return this.notificationsService.getNotifications({
      // userId: req.user.id,
      title: query.title,
      body: query.body,
      page: query.page,
      limit: query.limit,
    });
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Envoyer une notification push' })
  @ApiResponse({ status: 200, description: 'Notification envoyée avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  async sendNotification(@Body() dto: SendNotificationDto) {
    return await this.notificationsService.sendNotification(dto);
  }

  @Post('subscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'S\'abonner à un topic' })
  async subscribeToTopic(@Body() dto: SubscribeTopicDto) {
    return await this.notificationsService.subscribeToTopic(dto.tokens, dto.topic);
  }

  @Post('unsubscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Se désabonner d\'un topic' })
  async unsubscribeFromTopic(@Body() dto: SubscribeTopicDto) {
    return await this.notificationsService.unsubscribeFromTopic(dto.tokens, dto.topic);
  }

  @Post('validate-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Valider un token FCM' })
  async validateToken(@Body() dto: ValidateTokenDto) {
    const isValid = await this.notificationsService.validateToken(dto.token);
    return { valid: isValid };
  }
}
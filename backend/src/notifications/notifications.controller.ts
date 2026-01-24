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
  Request,
  Param,
  Put,
  ParseIntPipe
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import {
  SendNotificationDto,
} from './dto/send-notification.dto';
import { GetNotificationsQueryDto } from './dto/get-notifications-query.dto';
import { MarkNotificationAsReadDto } from './dto/mark-notification-read.dto';

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
  async subscribeToTopic(@Body() dto: SendNotificationDto) {
    return await this.notificationsService.subscribeToTopic(dto.tokens, dto.topic);
  }

  @Post('unsubscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Se désabonner d\'un topic' })
  async unsubscribeFromTopic(@Body() dto: SendNotificationDto) {
    return await this.notificationsService.unsubscribeFromTopic(dto.tokens, dto.topic);
  }

  // @Post('validate-token')
  // @HttpCode(HttpStatus.OK)
  // @ApiOperation({ summary: 'Valider un token FCM' })
  // async validateToken(@Body() dto: SendNotificationDto) {
  //   const isValid = await this.notificationsService.validateToken(dto.tokens);
  //   return { valid: isValid };
  // }

  // @Get('user/:userId')
  // @ApiOperation({ summary: 'Récupérer les notifications d\'un utilisateur' })
  // @ApiQuery({ name: 'read', required: false, type: Boolean })
  // @ApiQuery({ name: 'page', required: false, type: Number })
  // @ApiQuery({ name: 'limit', required: false, type: Number })
  // async getUserNotifications(
  //   @Param('userId') userId: number,
  //   @Query('read') read?: boolean,
  //   @Query('page') page?: number,
  //   @Query('limit') limit?: number,
  // ) {
  //   return this.notificationsService.getUserNotifications(userId, {
  //     read,
  //     page,
  //     limit,
  //   });
  // }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Récupérer les notifications d\'un utilisateur' })
  @ApiQuery({ name: 'read', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getUserNotifications(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('read') read?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // Convertir les paramètres de query
    const readBoolean = read === 'true' ? true : read === 'false' ? false : undefined;
    const pageNumber = page ? parseInt(page, 10) : undefined;
    const limitNumber = limit ? parseInt(limit, 10) : undefined;

    return this.notificationsService.getUserNotifications(userId, {
      read: readBoolean,
      page: pageNumber,
      limit: limitNumber,
    });
  }

  @Get('user/:userId/unread-count')
  @ApiOperation({ summary: 'Récupérer le nombre de notifications non lues' })
  async getUnreadCount(@Param('userId') userId: number) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Put('user/:userId/mark-read')
  @ApiOperation({ summary: 'Marquer une notification comme lue/non lue' })
  async markNotificationAsRead(
    @Param('userId') userId: number,
    @Body() dto: MarkNotificationAsReadDto,
  ) {
    return this.notificationsService.markNotificationAsRead(userId, dto);
  }

  @Put('user/:userId/mark-all-read')
  @ApiOperation({ summary: 'Marquer toutes les notifications comme lues' })
  async markAllNotificationsAsRead(@Param('userId') userId: number) {
    return this.notificationsService.markAllNotificationsAsRead(userId);
  }

  @Get(':notificationId/user/:userId')
  @ApiOperation({ summary: 'Récupérer les détails d\'une notification spécifique' })
  async getNotificationDetails(
    @Param('notificationId') notificationId: number,
    @Param('userId') userId: number,
  ) {
    return this.notificationsService.getNotificationDetails(notificationId, userId);
  }
}
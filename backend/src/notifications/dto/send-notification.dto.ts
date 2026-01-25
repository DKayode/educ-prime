import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString, IsNumber, IsObject, IsDateString } from 'class-validator';
import { NotificationType, NotificationPriority } from '../entities/notification.entity';

export class SendNotificationDto {
  @ApiProperty({ description: 'Titre de la notification' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Corps du message' })
  @IsString()
  body: string;

  @ApiProperty({
    description: 'IDs des utilisateurs destinataires',
    required: false,
    type: [Number]
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  utilisateurIds?: number[];

  @ApiProperty({
    description: 'Topic Firebase',
    required: false
  })
  @IsString()
  @IsOptional()
  topic?: string;

  @ApiProperty({
    description: 'Condition Firebase',
    required: false
  })
  @IsString()
  @IsOptional()
  condition?: string;

  @ApiProperty({
    description: 'Tokens FCM spécifiques',
    required: false,
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tokens?: string | string[];

  @ApiProperty({
    description: 'Type de notification',
    enum: NotificationType,
    required: false
  })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @ApiProperty({
    description: 'Priorité de la notification',
    enum: NotificationPriority,
    required: false
  })
  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority;

  @ApiProperty({
    description: 'Données supplémentaires au format JSON',
    required: false
  })
  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @ApiProperty({
    description: 'ID de l\'utilisateur émetteur',
    required: false
  })
  @IsNumber()
  @IsOptional()
  senderId?: number;

  @ApiProperty({
    description: 'Date d\'expiration de la notification',
    required: false
  })
  @IsDateString()
  @IsOptional()
  expiresAt?: Date;
}
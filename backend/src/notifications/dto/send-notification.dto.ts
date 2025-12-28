import { IsString, IsOptional, IsArray, IsObject, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendNotificationDto {
  @ApiProperty({ description: 'Titre de la notification' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Corps du message' })
  @IsString()
  body: string;

  @ApiProperty({
    description: 'Token(s) FCM du/des destinataire(s)',
    oneOf: [
      { type: 'string' },
      { type: 'array', items: { type: 'string' } }
    ]
  })
  @ValidateIf(o => !o.topic && !o.condition)
  tokens?: string | string[];

  @ApiProperty({
    description: 'Topic pour l\'envoi groupé',
    required: false
  })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiProperty({
    description: 'Condition pour l\'envoi ciblé',
    required: false
  })
  @IsOptional()
  @IsString()
  condition?: string;

  @ApiProperty({
    description: 'Données supplémentaires',
    required: false
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, string>;

  @ApiProperty({
    description: 'URL de l\'image à afficher',
    required: false
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class SubscribeTopicDto {
  @ApiProperty({ description: 'Token(s) FCM à abonner' })
  @IsArray()
  @IsString({ each: true })
  tokens: string[];

  @ApiProperty({ description: 'Topic auquel s\'abonner' })
  @IsString()
  topic: string;
}

export class ValidateTokenDto {
  @ApiProperty({ description: 'Token FCM à valider' })
  @IsString()
  token: string;
}
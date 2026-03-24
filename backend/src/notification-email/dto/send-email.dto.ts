import { IsString, IsNotEmpty, IsInt, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendEmailDto {
  @ApiProperty({ description: 'Titre de l\'email' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Corps de l\'email (HTML ou texte)' })
  @IsString()
  @IsNotEmpty()
  body: string;
}

export class UnsubscribeEmailDto {
  @ApiProperty({ description: 'UUID de l\'utilisateur à désabonner' })
  @IsString()
  @IsNotEmpty()
  uuid: string;
}

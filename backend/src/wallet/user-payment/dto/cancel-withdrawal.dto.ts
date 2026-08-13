import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CancelWithdrawalDto {
  /** Ce texte est envoyé tel quel à l'utilisateur : il doit lui dire quoi faire. */
  @ApiProperty({ example: "Le SMS n'a pas pu être livré sur ce numéro." })
  @IsString()
  @MinLength(5)
  reason: string;
}

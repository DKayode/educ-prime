import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UnlockWithdrawalOtpDto {
  @ApiProperty({
    example: 'Identité vérifiée par appel téléphonique et cohérence du compte Mobile Money confirmée.',
    description: 'Motif obligatoire du déblocage OTP après vérification administrateur.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;

  @ApiPropertyOptional({
    example: 'PHONE_CALL',
    enum: ['PHONE_CALL', 'ID_DOCUMENT', 'SUPPORT_REVIEW', 'OTHER'],
    description: 'Méthode utilisée par l’admin pour vérifier la légitimité de la demande.',
  })
  @IsOptional()
  @IsString()
  @IsIn(['PHONE_CALL', 'ID_DOCUMENT', 'SUPPORT_REVIEW', 'OTHER'])
  verificationMethod?: 'PHONE_CALL' | 'ID_DOCUMENT' | 'SUPPORT_REVIEW' | 'OTHER';

  @ApiPropertyOptional({
    example: true,
    description: 'Si true, un nouvel OTP est généré et envoyé après déblocage.',
  })
  @IsOptional()
  @IsBoolean()
  allowNewOtp?: boolean;
}

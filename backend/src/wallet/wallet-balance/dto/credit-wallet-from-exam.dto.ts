import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class CreditWalletFromExamDto {
  @ApiProperty({ example: 12 }) @IsInt() userId: number;
  @ApiProperty({ example: 'exam_8741' }) @IsString() @IsNotEmpty() @MaxLength(120) examId: string;
  @ApiPropertyOptional({ example: 250, description: 'Optionnel. Si absent, le montant vient de la configuration EPREUVE.' }) @IsOptional() @IsNumber() @IsPositive() amount?: number;
  @ApiPropertyOptional({ example: 'XOF' }) @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ example: 'EXAM_REWARD:exam_8741' }) @IsOptional() @IsString() reference?: string;
}

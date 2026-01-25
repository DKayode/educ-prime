import { Controller, Post, Body, UseGuards, HttpCode, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto, LoginWithDeviceDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AppareilType } from './entities/refresh-token.entity';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('connexion')
  @HttpCode(200)
  async login(@Body() loginDto: LoginWithDeviceDto) {
    return this.authService.login(loginDto, loginDto.appareil);
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshAccessToken(refreshTokenDto.refresh_token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('deconnexion')
  async logout(@Request() req) {
    const userId = req.user?.utilisateurId;
    const token = req.headers.authorization?.split(' ')[1];

    await this.authService.revokeRefreshToken(userId);

    if (token) {
      await this.authService.blacklistAccessToken(token);
    }

    return { message: 'Déconnexion réussie' };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    await this.authService.forgotPassword(forgotPasswordDto.email);
    return { message: 'Si l\'email existe, un code a été envoyé' };
  }

  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.authService.resetPassword(resetPasswordDto);
    return { message: 'Mot de passe réinitialisé avec succès' };
  }
}
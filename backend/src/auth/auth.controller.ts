import { Controller, Post, Body, UseGuards, HttpCode, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto, LoginWithDeviceDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AppareilType } from './entities/refresh-token.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
    const userId = req.user.utilisateurId;
    await this.authService.revokeRefreshToken(userId);
    return { message: 'Déconnexion réussie' };
  }
}
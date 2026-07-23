import { Body, CanActivate, Controller, ExecutionContext, ForbiddenException, Injectable, Post, Query, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiHeader, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { InfobipDeliveryReportDto } from './dto/infobip-delivery-report.dto';
import { HandleInfobipDeliveryReportUseCase } from './use-cases/handle-infobip-delivery-report.use-case';

@Injectable()
export class InfobipWebhookGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('INFOBIP_WEBHOOK_SECRET');
    if (!expected) {
      throw new ForbiddenException('INFOBIP_WEBHOOK_SECRET est obligatoire pour sécuriser le webhook Infobip');
    }

    const request = context.switchToHttp().getRequest();
    const headerSecret = request.headers['x-infobip-webhook-secret'];
    const querySecret = request.query?.secret;
    const received = Array.isArray(headerSecret) ? headerSecret[0] : headerSecret || querySecret;

    if (received !== expected) {
      throw new ForbiddenException('Webhook Infobip non autorisé');
    }

    return true;
  }
}

@ApiTags('Internal - OTP Infobip')
@Controller('internal/otp/infobip')
export class InfobipDeliveryReportController {
  constructor(private readonly handleDeliveryReport: HandleInfobipDeliveryReportUseCase) {}

  @Post('delivery-report')
  @UseGuards(InfobipWebhookGuard)
  @ApiOperation({ summary: 'Recevoir les delivery reports Infobip pour les OTP de retrait' })
  @ApiHeader({
    name: 'x-infobip-webhook-secret',
    required: false,
    description: 'Secret webhook partagé. Peut aussi être envoyé via ?secret=...',
  })
  @ApiQuery({ name: 'secret', required: false, description: 'Alternative au header x-infobip-webhook-secret' })
  receiveDeliveryReport(@Body() dto: InfobipDeliveryReportDto, @Query('secret') _secret?: string) {
    return this.handleDeliveryReport.execute(dto);
  }
}

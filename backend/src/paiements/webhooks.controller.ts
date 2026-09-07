import { Body, Controller, Headers, Param, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { PaiementsService } from './paiements.service';
import { PrestatairePaiement } from './shared/paiement.enums';

@ApiTags('paiements-webhooks')
@Controller('paiements/webhooks')
export class WebhooksController {
  constructor(private readonly paiements: PaiementsService) {}

  @Post(':prestataire')
  @ApiOperation({ summary: 'Webhook PSP signé, sans authentification JWT' })
  recevoir(
    @Param('prestataire') prestataire: string,
    @Req() req: Request & { rawBody?: Buffer },
    @Headers() headers: Record<string, any>,
    @Body() body: unknown,
  ) {
    return this.paiements.recevoirWebhook(
      prestataire.toUpperCase() as PrestatairePaiement,
      req.rawBody ?? Buffer.from(JSON.stringify(body ?? {})),
      headers,
      body,
    );
  }
}

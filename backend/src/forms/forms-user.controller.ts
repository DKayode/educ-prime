import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FormsService } from './forms.service';
import { SoumettreReponseDto } from './dto/soumettre-reponse.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentCountry } from '../common/decorators/current-country.decorator';

// User-facing form endpoints (any authenticated user, no admin role).
// Mounted on /forms; declared BEFORE FormsController so the literal
// `/forms/active` route is matched ahead of the admin `/forms/:uuid`.
@ApiTags('forms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('forms')
export class FormsUserController {
  constructor(private readonly formsService: FormsService) {}

  @Get('active')
  @ApiOperation({
    summary:
      "Campagne active du pays non encore répondue par l'utilisateur (null sinon)",
  })
  getActive(@CurrentCountry() pays: string, @Request() req: any) {
    return this.formsService.getActive(pays, req.user.utilisateurId);
  }

  @Post(':uuid/responses')
  @ApiOperation({ summary: 'Soumettre une réponse à une campagne' })
  submit(
    @CurrentCountry() pays: string,
    @Param('uuid') uuid: string,
    @Body() dto: SoumettreReponseDto,
    @Request() req: any,
  ) {
    return this.formsService.submitResponse(
      pays,
      uuid,
      req.user.utilisateurId,
      dto,
    );
  }
}

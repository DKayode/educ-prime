import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EpreuveSubmissionsService } from './epreuve-submissions.service';

// Routes added in V2-D3 (POST /epreuves/submissions) and V2-D4 (admin list +
// approve/decline). Mounted at 'epreuves/submissions'; this controller is
// registered BEFORE EpreuvesController so GET /epreuves/submissions is not
// shadowed by GET /epreuves/:id.
@ApiTags('epreuve-submissions')
@Controller('epreuves/submissions')
export class EpreuveSubmissionsController {
  constructor(private readonly submissionsService: EpreuveSubmissionsService) { }
}

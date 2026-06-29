import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { DataSourceResolver } from '../../config/data-source-resolver.service';
import { EpreuveSubmission } from './entities/epreuve-submission.entity';

@Injectable()
export class EpreuveSubmissionsService {
  private readonly logger = new Logger(EpreuveSubmissionsService.name);

  constructor(private readonly resolver: DataSourceResolver) { }

  private get submissionsRepository(): Repository<EpreuveSubmission> {
    return this.resolver.getRepository(EpreuveSubmission);
  }

  // Endpoints land in V2-D3 (step-1 submit) and V2-D4 (admin list + approve/decline).
}

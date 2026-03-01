import { Module } from '@nestjs/common';
import { AvisController } from './avis.controller';
import { AvisService } from './avis.service';

@Module({
  controllers: [AvisController],
  providers: [AvisService]
})
export class AvisModule {}

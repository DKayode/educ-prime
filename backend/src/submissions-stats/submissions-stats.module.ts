import { Module } from '@nestjs/common';
import { SubmissionsStatsController } from './submissions-stats.controller';
import { SubmissionsStatsService } from './submissions-stats.service';

@Module({
  controllers: [SubmissionsStatsController],
  providers: [SubmissionsStatsService],
})
export class SubmissionsStatsModule {}

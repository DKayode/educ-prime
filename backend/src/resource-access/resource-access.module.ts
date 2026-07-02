import { Module } from '@nestjs/common';
import { ResourceAccessService } from './resource-access.service';

@Module({
  providers: [ResourceAccessService],
  exports: [ResourceAccessService],
})
export class ResourceAccessModule {}

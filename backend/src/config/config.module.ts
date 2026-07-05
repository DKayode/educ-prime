import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Minimal re-export module. The app registers ConfigModule.forRoot({ isGlobal:
// true }) in AppModule, so importing this just gives modules access to
// ConfigService without re-calling forRoot.
@Module({
  imports: [ConfigModule],
  exports: [ConfigModule],
})
export class LocalConfigModule {}

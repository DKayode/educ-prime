import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FirebaseService } from './firebase.service';
import { FirebaseConfig } from '../config/firebase.config';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [FirebaseService, FirebaseConfig],
  exports: [FirebaseService, FirebaseConfig],
})
export class FirebaseModule { }
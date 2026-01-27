import { Module, Global } from '@nestjs/common';
import { ConcoursNotifEvent, EvenementNotifEvent, OpportuniteNotifEvent, ParcoursNotifEvent } from './notifications.events';

@Global()
@Module({
  imports: [
    // EventEmitterModule.forRoot({
    //   wildcard: false,
    //   delimiter: '.',
    //   newListener: false,
    //   removeListener: false,
    //   maxListeners: 10,
    //   verboseMemoryLeak: false,
    //   ignoreErrors: false,
    // }),
  ],
  // providers: [ParcoursNotifEvent, OpportuniteNotifEvent, ConcoursNotifEvent, EvenementNotifEvent],
  // exports: [EventEmitterModule],
})

export class EventsModule { }

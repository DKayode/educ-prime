import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { Repository, In } from 'typeorm';
import { Utilisateur } from 'src/utilisateurs/entities/utilisateur.entity';
import { Notification } from './entities/notification.entity';
import { NotificationUtilisateur } from './entities/notification-utilisateur.entity';
import { FirebaseService, NotificationPayload } from '../firebase/firebase.service';
import { DataSourceResolver } from '../config/data-source-resolver.service';
import { CountryContextService } from '../config/country-context.service';

@Processor('push')
export class PushProcessor extends WorkerHost {
  private readonly logger = new Logger(PushProcessor.name);

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly resolver: DataSourceResolver,
    private readonly context: CountryContextService,
    @InjectQueue('push') private readonly pushQueue: Queue,
  ) {
    super();
  }

  private get utilisateurRepository(): Repository<Utilisateur> { return this.resolver.getRepository(Utilisateur); }
  private get notificationRepository(): Repository<Notification> { return this.resolver.getRepository(Notification); }
  private get notificationUtilisateurRepository(): Repository<NotificationUtilisateur> { return this.resolver.getRepository(NotificationUtilisateur); }

  async process(job: Job<any, any, string>): Promise<any> {
    const { name, data } = job;
    const country: string = data?.country ?? 'benin';

    return this.context.run(country, async () => {
      if (name === 'prepare-push-broadcast') {
        return this.handlePreparePushBroadcast(job);
      }
      this.logger.warn(`Unknown job name: ${name}`);
      return null;
    });
  }

  private async handlePreparePushBroadcast(job: Job<any>) {
    const { dto, notificationId } = job.data;
    
    // 1. Lookup users
    let utilisateurs: Utilisateur[] = [];
    if (dto.utilisateurIds && dto.utilisateurIds.length > 0) {
      utilisateurs = await this.utilisateurRepository.find({
        where: { id: In(dto.utilisateurIds) }
      });
    } else {
      utilisateurs = await this.utilisateurRepository.find();
    }
    
    const utilisateursIds = utilisateurs.map(u => u.id);
    const totalDestinataires = utilisateursIds.length;
    
    if (totalDestinataires === 0) {
      this.logger.log(`No users found for push broadcast ${job.id}`);
      return { totalDestinataires: 0, sentCount: 0, failedCount: 0 };
    }

    const client = await this.pushQueue.client;
    // Set total count in Redis
    await client.hset(`push-broadcast:${job.id}`, 'total', totalDestinataires.toString());
    await client.expire(`push-broadcast:${job.id}`, 86400);

    // 2. Save DB relations in chunks
    const relations = utilisateursIds.map(utilisateurId => {
      return this.notificationUtilisateurRepository.create({
        notificationId,
        utilisateurId,
        isRead: false,
        readAt: null,
      });
    });

    const dbChunkSize = 1000;
    for (let i = 0; i < relations.length; i += dbChunkSize) {
      const isCanceled = await client.get(`push-broadcast:${job.id}:canceled`);
      if (isCanceled === 'true') {
        this.logger.log(`Job push ${job.id} canceled during DB preparation.`);
        return { status: 'canceled' };
      }

      const chunk = relations.slice(i, i + dbChunkSize);
      await this.notificationUtilisateurRepository.save(chunk);
      
      const dbProgress = Math.round((i / relations.length) * 10);
      await job.updateProgress(dbProgress);
    }

    // 3. Prepare Firebase Multicast
    const payload: NotificationPayload = {
      title: dto.title,
      body: dto.body,
      data: { notificationId: notificationId.toString() },
    };

    const tokens = utilisateurs
      .map(u => u.fcm_token)
      .filter((token): token is string =>
        token !== null && token !== undefined && token.trim().length > 0
      );

    let totalSuccess = 0;
    let totalFailure = 0;
    const totalTokens = tokens.length;
    
    if (totalTokens === 0) {
      return { totalDestinataires, tokensFound: 0, sentCount: 0, failedCount: 0 };
    }

    const firebaseChunkSize = 500;
    for (let i = 0; i < totalTokens; i += firebaseChunkSize) {
      const isCanceled = await client.get(`push-broadcast:${job.id}:canceled`);
      if (isCanceled === 'true') {
        this.logger.log(`Job push ${job.id} canceled during Firebase sending.`);
        break;
      }

      const tokenChunk = tokens.slice(i, i + firebaseChunkSize);
      
      try {
        const results = await this.firebaseService.sendToTokens({
          tokens: tokenChunk,
          payload,
        });
        
        const sc = results.successCount || 0;
        const fc = results.failureCount || 0;
        
        totalSuccess += sc;
        totalFailure += fc;

        await client.hincrby(`push-broadcast:${job.id}`, 'sentCount', sc);
        await client.hincrby(`push-broadcast:${job.id}`, 'failedCount', fc);
      } catch (error) {
        this.logger.error(`Firebase batch error: ${error.message}`);
        totalFailure += tokenChunk.length;
        await client.hincrby(`push-broadcast:${job.id}`, 'failedCount', tokenChunk.length);
      }

      const fireProgress = 10 + Math.round(((i + tokenChunk.length) / totalTokens) * 90);
      await job.updateProgress(Math.min(fireProgress, 100));
    }

    return { 
      totalDestinataires, 
      tokensFound: totalTokens, 
      sentCount: totalSuccess, 
      failedCount: totalFailure 
    };
  }

  @OnWorkerEvent('active')
  onActive(job: Job) { this.logger.log(`Job Push ${job.id} started.`); }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) { this.logger.log(`Job Push ${job.id} completed.`); }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) { this.logger.error(`Job Push ${job.id} failed: ${error.message}`); }
}

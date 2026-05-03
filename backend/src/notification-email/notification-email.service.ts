import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { MailService } from '../mail/mail.service';
import { SendEmailDto } from './dto/send-email.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Utilisateur } from '../utilisateurs/entities/utilisateur.entity';
import { DesabonnementEmail } from './entities/desabonnement-email.entity';
import { DataSourceResolver } from '../config/data-source-resolver.service';
import { CountryContextService } from '../config/country-context.service';

@Injectable()
export class NotificationEmailService {
  private readonly logger = new Logger(NotificationEmailService.name);

  constructor(
    private readonly mailService: MailService,
    private readonly resolver: DataSourceResolver,
    private readonly context: CountryContextService,
    @InjectQueue('email') private readonly emailQueue: Queue,
  ) { }

  private get utilisateursRepository(): Repository<Utilisateur> { return this.resolver.getRepository(Utilisateur); }
  private get desabonnementRepository(): Repository<DesabonnementEmail> { return this.resolver.getRepository(DesabonnementEmail); }

  async sendBroadcast(dto: SendEmailDto) {
    // Country embedded so the BullMQ worker can re-establish ALS context.
    const country = this.context.getCountryOrNull() ?? 'benin';
    const job = await this.emailQueue.add('prepare-broadcast', { ...dto, country }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: false,
    });

    this.logger.log(`Broadcast job ${job.id} queued successfully.`);

    return {
      message: 'Email broadcast has been queued.',
      jobId: job.id,
    };
  }

  async getJobStatus(jobId: string) {
    const job = await this.emailQueue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    const result: any = {
      id: job.id,
      name: job.name,
      status: state,
      progress: job.progress,
      data: job.data,
      result: job.returnvalue,
    };

    // For the new distributed architecture
    if (job.name === 'prepare-broadcast') {
      const client = await this.emailQueue.client;
      const stats = await client.hgetall(`broadcast:${jobId}`);
      
      const success = parseInt(stats?.success || '0');
      const failure = parseInt(stats?.failure || '0');
      const total = job.returnvalue?.totalJobsQueued || 0;
      
      // Get daily count
      const today = new Date().toISOString().split('T')[0];
      const dailyKey = `email:daily-count:${today}`;
      const dailyCount = parseInt(await client.get(dailyKey) || '0');
      
      if (total > 0) {
        const progress = Math.round(((success + failure) / total) * 100);
        return {
          ...result,
          sentCount: success,
          failedCount: failure,
          totalCount: total,
          dailyCount: dailyCount,
          dailyLimit: 1000,
          progress: progress,
          status: (success + failure) >= total ? 'completed' : 'processing',
        };
      }
    }

    return result;
  }

  async unsubscribe(uuid: string) {
    const user = await this.utilisateursRepository.findOne({ where: { uuid } });
    if (!user || !user.uuid) {
      throw new NotFoundException('Utilisateur introuvable avec ce UUID.');
    }

    const existing = await this.desabonnementRepository.findOne({
      where: { utilisateur_uuid: user.uuid },
    });
    if (!existing) {
      const entry = this.desabonnementRepository.create({ utilisateur_uuid: user.uuid });
      await this.desabonnementRepository.save(entry);
      this.logger.log(`Utilisateur ${user.uuid} a été ajouté à la liste de désabonnement email.`);
    }

    return { message: 'Désabonnement réussi' };
  }

  async cancelJob(jobId: string) {
    // Set a global cancellation flag for this broadcast in Redis
    const client = await this.emailQueue.client;
    await client.set(`broadcast:${jobId}:canceled`, 'true', 'EX', 86400); // 24h expiration
    
    const job = await this.emailQueue.getJob(jobId);
    if (job) {
      await job.remove();
      this.logger.log(`Parent job ${jobId} removed and cancellation flag set.`);
    } else {
      this.logger.log(`Cancellation flag set for jobId ${jobId} (parent job not found or already finished).`);
    }
    
    return { success: true, message: `Broadcast ${jobId} has been stopped.` };
  }

  async drainQueue() {
    await this.emailQueue.drain();
    this.logger.log(`Email queue drained successfully.`);
    return { success: true, message: 'Queue drained' };
  }
}

import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { SendEmailDto } from './dto/send-email.dto';

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly mailService: MailService,
    private readonly prisma: PrismaService,
    @InjectQueue('email') private readonly emailQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { name, data } = job;

    if (name === 'prepare-broadcast') {
      return this.handlePrepareBroadcast(job);
    }

    if (name === 'send-single-email') {
      return this.handleSendSingleEmail(job);
    }
    
    this.logger.warn(`Unknown job name: ${name}`);
    return null;
  }

  private async handlePrepareBroadcast(job: Job<SendEmailDto>) {
    const { data } = job;
    
    // 1. Fetch all users to receive the email
    const targetUsers = await this.prisma.utilisateurs.findMany({
      where: {
        desabonnement_email: null,
        email: { not: '' }
      },
      select: { id: true, email: true, uuid: true }
    });

    const validUsers = targetUsers.filter(u => !!u.email && !!u.uuid);
    const total = validUsers.length;

    this.logger.log(`Job ${job.id}: Found ${targetUsers.length} total users, ${total} valid subscribers. Spawning individual jobs...`);

    if (total === 0) {
      this.logger.log(`No valid subscribed users found for job ${job.id}`);
      return { sent: 0, total: 0 };
    }

    // 2. Add individual jobs to the queue
    const jobs = validUsers.map(user => ({
      name: 'send-single-email',
      data: {
        email: user.email,
        uuid: user.uuid,
        title: data.title,
        body: data.body,
        parentId: job.id
      },
      opts: {
        jobId: `email-${job.id}-${user.uuid}`, // Prevent duplicates
        attempts: 10,
        backoff: {
          type: 'exponential',
          delay: 60000,
        }
      }
    }));

    // Add them in chunks to Redis to avoid blocking
    const chunkSize = 100;
    for (let i = 0; i < jobs.length; i += chunkSize) {
      await this.emailQueue.addBulk(jobs.slice(i, i + chunkSize));
      this.logger.log(`Preparation Progress: ${i + Math.min(chunkSize, jobs.length - i)}/${total} jobs queued.`);
    }

    return { totalJobsQueued: total };
  }

  private async handleSendSingleEmail(job: Job<any>) {
    const { email, title, body, uuid, parentId } = job.data;
    const frontendUrl = process.env.FRONTEND_URL || 'https://educ-prime.cloud';

    // Check if the parent broadcast was canceled
    if (parentId) {
      const client = await this.emailQueue.client;
      const isCanceled = await client.get(`broadcast:${parentId}:canceled`);
      if (isCanceled === 'true') {
        this.logger.log(`Job ${job.id} skipped - Parent broadcast ${parentId} was canceled.`);
        return { status: 'canceled', recipient: email };
      }
    }

    // Check Daily Quota (1000 emails/day)
    const client = await this.emailQueue.client;
    const today = new Date().toISOString().split('T')[0];
    const dailyKey = `email:daily-count:${today}`;
    
    const currentDailyCount = await client.get(dailyKey);
    if (parseInt(currentDailyCount || '0') >= 1000) {
      this.logger.warn(`Daily quota reached (1000). Delaying job ${job.id}.`);
      throw new Error('DAILY_QUOTA_REACHED'); // BullMQ will retry with backoff
    }

    try {
      const unsubscribeHtml = `
        <br><br><br>
        <hr style="border: none; border-top: 1px solid #eaeaea;" />
        <div style="text-align: center; padding: 20px 0; font-family: sans-serif; font-size: 12px; color: #888;">
          Vous recevez cet email car vous êtes inscrit sur notre plateforme.<br>
          Pour ne plus recevoir ces notifications, vous pouvez 
          <a href="${frontendUrl}/desabonnement?uuid=${uuid}" style="color: #009a44; text-decoration: underline;">désabonner</a>.
        </div>
      `;
      const finalHtmlBody = body + unsubscribeHtml;
      
      await this.mailService.sendPersonalizedEmail(email, title, finalHtmlBody);
      
      // Increment daily counter
      await client.incr(dailyKey);
      await client.expire(dailyKey, 86400); // 24h

      // Increment success counter in Redis
      if (job.data.parentId) {
        const client = await this.emailQueue.client;
        const key = `broadcast:${job.data.parentId}`;
        await client.hincrby(key, 'success', 1);
        await client.expire(key, 86400); // 24 hours TTL
      }

      return { status: 'sent', recipient: email };
    } catch (error) {
      this.logger.error(`Error sending to ${email}: ${error.message}`);
      
      // If we are on the last attempt, increment failure counter
      if (job.attemptsMade + 1 >= job.opts.attempts) {
        if (job.data.parentId) {
          const client = await this.emailQueue.client;
          const key = `broadcast:${job.data.parentId}`;
          await client.hincrby(key, 'failure', 1);
          await client.expire(key, 86400); // 24 hours TTL
        }
      }

      // If we hit a rate limit, the job will fail and BullMQ will retry based on job options
      throw error; 
    }
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.log(`Job ${job.id} started.`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed.`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`);
  }
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { FormCampaign } from './form-campaign.entity';
import { FormAnswer } from './form-answer.entity';

@Entity('form_responses')
export class FormResponse {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  campaign_id: string;

  @ApiProperty()
  @Column({ type: 'integer' })
  user_id: number;

  @Column({ type: 'varchar', length: 50, default: 'benin' })
  pays: string;

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamp with time zone', name: 'submitted_at' })
  submitted_at: Date;

  @ManyToOne(() => FormCampaign, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'campaign_id' })
  campaign: FormCampaign;

  @OneToMany(() => FormAnswer, (answer) => answer.response)
  answers: FormAnswer[];
}

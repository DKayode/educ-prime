import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { FormCampaign } from './form-campaign.entity';
import { FormQuestion } from './form-question.entity';

@Entity('form_sections')
export class FormSection {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  campaign_id: string;

  @ApiProperty()
  @Column()
  titre: string;

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: 'varchar', length: 50, nullable: true })
  icone: string | null;

  @ApiProperty()
  @Column({ type: 'int', default: 0 })
  ordre: number;

  @ManyToOne(() => FormCampaign, (campaign) => campaign.sections, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'campaign_id' })
  campaign: FormCampaign;

  @OneToMany(() => FormQuestion, (question) => question.section)
  questions: FormQuestion[];
}

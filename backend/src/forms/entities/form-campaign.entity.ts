import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { FormSection } from './form-section.entity';

export type CampaignStatut = 'draft' | 'active' | 'archived';

@Entity('form_campaigns')
export class FormCampaign {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column()
  titre: string;

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({ enum: ['draft', 'active', 'archived'] })
  @Column({ type: 'varchar', length: 20, default: 'draft' })
  statut: CampaignStatut;

  @ApiProperty()
  @Column({ type: 'varchar', length: 30, default: 'app_open' })
  trigger_type: string;

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: 'timestamp with time zone', nullable: true })
  date_debut: Date | null;

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: 'timestamp with time zone', nullable: true })
  date_fin: Date | null;

  @Column({ type: 'varchar', length: 50, default: 'benin' })
  pays: string;

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: 'integer', nullable: true })
  created_by: number | null;

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamp with time zone', name: 'date_creation' })
  date_creation: Date;

  @OneToMany(() => FormSection, (section) => section.campaign)
  sections: FormSection[];
}

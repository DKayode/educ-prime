import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Departement } from '../../departements/entities/departement.entity';

@Entity('villes')
export class Ville {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, default: 'benin' })
  pays: string;

  @ApiProperty()
  @Column()
  nom: string;

  @ApiProperty()
  @Column('uuid')
  departement_id: string;

  @ApiProperty({ type: () => Departement })
  @ManyToOne(() => Departement, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'departement_id' })
  departement: Departement;

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamp with time zone', name: 'date_creation' })
  date_creation: Date;
}

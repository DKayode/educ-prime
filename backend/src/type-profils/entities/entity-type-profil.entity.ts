import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { TypeProfil } from './type-profil.entity';

// Registre : associe UN type de profil à une entité de contenu (par pays).
// Unicité (entity, pays) — voir migration 044.
@Entity('entity_type_profil')
export class EntityTypeProfil {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  entity: string;

  @Column()
  type_profil_id: number;

  @ManyToOne(() => TypeProfil, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'type_profil_id' })
  type_profil: TypeProfil;

  @Column({ type: 'varchar', length: 50, default: 'benin' })
  pays: string;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'date_creation' })
  date_creation: Date;
}

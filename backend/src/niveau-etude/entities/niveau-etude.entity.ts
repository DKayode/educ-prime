import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Filiere } from '../../filieres/entities/filiere.entity';

@Entity('niveau_etude')
export class NiveauEtude {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nom: string;

  @Column({ nullable: true })
  duree_mois: number;

  @Column()
  filiere_id: number;

  @ManyToOne(() => Filiere, { nullable: false })
  @JoinColumn({ name: 'filiere_id' })
  filiere: Filiere;
}
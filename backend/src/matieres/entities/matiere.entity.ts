import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { NiveauEtude } from '../../niveau-etude/entities/niveau-etude.entity';
import { Filiere } from '../../filieres/entities/filiere.entity';

@Entity('matieres')
export class Matiere {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nom: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  niveau_etude_id: number;

  @Column()
  filiere_id: number;

  @ManyToOne(() => NiveauEtude, { nullable: false })
  @JoinColumn({ name: 'niveau_etude_id' })
  niveau_etude: NiveauEtude;

  @ManyToOne(() => Filiere, { nullable: false })
  @JoinColumn({ name: 'filiere_id' })
  filiere: Filiere;
}
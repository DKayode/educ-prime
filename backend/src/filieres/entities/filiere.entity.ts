import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Etablissement } from '../../etablissements/entities/etablissement.entity';

@Entity('filieres')
export class Filiere {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nom: string;

  @ManyToOne(() => Etablissement)
  @JoinColumn({ name: 'etablissement_id' })
  etablissement: Etablissement;
}
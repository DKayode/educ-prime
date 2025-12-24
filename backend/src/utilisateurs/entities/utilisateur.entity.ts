import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Etablissement } from '../../etablissements/entities/etablissement.entity';
import { Filiere } from '../../filieres/entities/filiere.entity';
import { NiveauEtude } from '../../niveau-etude/entities/niveau-etude.entity';

export enum RoleType {
  ADMIN = 'admin',
  ETUDIANT = 'étudiant',
  PROFESSEUR = 'professeur'
}

export enum SexeType {
  M = 'M',
  F = 'F',
  AUTRE = 'Autre'
}

@Entity('utilisateurs')
export class Utilisateur {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nom: string;

  @Column()
  prenom: string;

  @Column({ nullable: true })
  pseudo: string;

  @Column({ unique: true })
  email: string;

  @Column()
  mot_de_passe: string;

  @Column({ nullable: true })
  photo: string;

  @Column({ type: 'enum', enum: SexeType, nullable: true })
  sexe: SexeType;

  @Column({ nullable: true })
  telephone: string;

  @Column({ type: 'enum', enum: RoleType })
  role: RoleType;

  @ManyToOne(() => Etablissement, { nullable: true })
  @JoinColumn({ name: 'etablissement_id' })
  etablissement: Etablissement;

  @ManyToOne(() => Filiere, { nullable: true })
  @JoinColumn({ name: 'filiere_id' })
  filiere: Filiere;

  @ManyToOne(() => NiveauEtude, { nullable: true })
  @JoinColumn({ name: 'niveau_etude_id' })
  niveau_etude: NiveauEtude;
}
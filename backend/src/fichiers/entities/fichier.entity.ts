import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Utilisateur } from '../../utilisateurs/entities/utilisateur.entity';

export enum TypeFichier {
  PROFILE = 'profile',
  EPREUVE = 'epreuve',
  RESSOURCE = 'ressource',
  PUBLICITE = 'PUBLICITE',
  EVENEMENT = 'EVENEMENT',
  OPPORTUNITE = 'OPPORTUNITE',
  CONCOURS = 'CONCOURS',
  ETABLISSEMENT = 'ETABLISSEMENT'
}

export enum TypeRessource {
  DOCUMENT = 'Document',
  QUIZ = 'Quiz',
  EXERCICES = 'Exercices'
}

@Entity()
export class Fichier {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  filename: string;

  @Column()
  originalName: string;

  @Column()
  url: string;

  @Column({
    type: 'enum',
    enum: TypeFichier
  })
  type: TypeFichier;

  @Column({
    type: 'enum',
    enum: TypeRessource,
    nullable: true
  })
  typeRessource?: TypeRessource;

  @Column()
  utilisateurId: number;

  @Column({ nullable: true })
  matiereId?: number;

  @Column({ nullable: true })
  epreuveId?: number;

  @Column({ nullable: true })
  ressourceId?: number;

  @ManyToOne(() => Utilisateur, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'utilisateurId' })
  utilisateur: Utilisateur;

  @CreateDateColumn()
  date_creation: Date;
}
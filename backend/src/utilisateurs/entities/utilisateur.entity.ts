import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, CreateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Etablissement } from '../../etablissements/entities/etablissement.entity';
import { Filiere } from '../../filieres/entities/filiere.entity';
import { NiveauEtude } from '../../niveau-etude/entities/niveau-etude.entity';
import { Commentaire } from 'src/commentaires/entities/commentaire.entity';
import { Exclude } from 'class-transformer';
import { NotificationUtilisateur } from 'src/notifications/entities/notification-utilisateur.entity';

export enum RoleType {
  ADMIN = 'admin',
  ETUDIANT = 'étudiant',
  PROFESSEUR = 'professeur',
  AUTRE = 'autre'
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

  @Column({ nullable: true, unique: true })
  pseudo: string;

  @Column({ type: 'uuid', nullable: true, unique: true })
  uuid: string;

  @Column({ nullable: true, unique: true })
  mon_code_parrainage: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  mot_de_passe: string;

  @Column({ default: false })
  est_desactive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  date_suppression_prevue: Date;

  @ApiProperty({ description: 'Date de création de l\'utilisateur' })
  @CreateDateColumn()
  date_creation: Date;

  @Column({ nullable: true })
  photo: string;

  @Column({ type: 'enum', enum: SexeType, nullable: true })
  sexe: SexeType;

  @Column({ nullable: true })
  telephone: string;

  @Column({ type: 'text', nullable: true })
  fcm_token: string;

  @Column({ nullable: true })
  code_reinitialisation: string;

  @Column({ type: 'timestamp', nullable: true })
  date_expiration_code: Date;

  @Column({ type: 'enum', enum: RoleType })
  role: RoleType;

  @Column({ nullable: true })
  etablissement_id: number;

  @ManyToOne(() => Etablissement, { nullable: true })
  @JoinColumn({ name: 'etablissement_id' })
  etablissement: Etablissement;

  @Column({ nullable: true })
  filiere_id: number;

  @ManyToOne(() => Filiere, { nullable: true })
  @JoinColumn({ name: 'filiere_id' })
  filiere: Filiere;

  @Column({ nullable: true })
  niveau_etude_id: number;

  @ManyToOne(() => NiveauEtude, { nullable: true })
  @JoinColumn({ name: 'niveau_etude_id' })
  niveau_etude: NiveauEtude;

  @OneToMany(() => Commentaire, commentaire => commentaire.utilisateur)
  commentaires: Commentaire[];

  @OneToMany(
    () => NotificationUtilisateur,
    (notificationUtilisateur) => notificationUtilisateur.utilisateur,
  )
  notificationUtilisateurs: NotificationUtilisateur[];

  notifications?: Notification[];

  @ManyToOne(() => Utilisateur, (utilisateur) => utilisateur.filleuls, { nullable: true })
  @JoinColumn({ name: 'parrain_id' })
  parrain: Utilisateur;

  @OneToMany(() => Utilisateur, (utilisateur) => utilisateur.parrain)
  filleuls: Utilisateur[];

  unreadNotificationsCount?: number;
}
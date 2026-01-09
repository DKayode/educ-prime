import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Etablissement } from '../../etablissements/entities/etablissement.entity';
import { Filiere } from '../../filieres/entities/filiere.entity';
import { NiveauEtude } from '../../niveau-etude/entities/niveau-etude.entity';
import { Commentaire } from 'src/commentaires/entities/commentaire.entity';
import { Exclude } from 'class-transformer';
import { NotificationUtilisateur } from 'src/notifications/entities/notification-utilisateur.entity';

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

  @Column({ nullable: false })
  @Exclude()
  mot_de_passe: string;

  @Column({ nullable: true })
  photo: string;

  @Column({ type: 'enum', enum: SexeType, nullable: true })
  sexe: SexeType;

  @Column({ nullable: true })
  telephone: string;

  @Column({ type: 'text', nullable: true })
  fcm_token: string;

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

  @OneToMany(() => Commentaire, commentaire => commentaire.utilisateur)
  commentaires: Commentaire[];

  @OneToMany(
    () => NotificationUtilisateur,
    (notificationUtilisateur) => notificationUtilisateur.utilisateur,
  )
  notificationUtilisateurs: NotificationUtilisateur[];

  notifications?: Notification[];

  unreadNotificationsCount?: number;
}
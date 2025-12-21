import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('etablissements')
export class Etablissement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nom: string;

  @Column({ nullable: true })
  ville: string;

  @Column({ nullable: true })
  code_postal: string;

  @Column({ nullable: true })
  logo: string;
}
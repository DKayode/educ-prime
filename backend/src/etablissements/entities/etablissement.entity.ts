import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('etablissements')
export class Etablissement {
  @ApiProperty({ description: "L'identifiant unique de l'établissement" })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "Le nom de l'établissement" })
  @Column()
  nom: string;

  @ApiProperty({ description: "La ville de l'établissement", required: false })
  @Column({ nullable: true })
  ville: string;

  @ApiProperty({ description: "Le code postal de l'établissement", required: false })
  @Column({ nullable: true })
  code_postal: string;

  @ApiProperty({ description: "Le chemin du logo de l'établissement", required: false })
  @Column({ nullable: true })
  logo: string;
}
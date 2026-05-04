import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Etablissement } from '../../etablissements/entities/etablissement.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('filieres')
export class Filiere {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;


  @Column({ type: "varchar", length: 50, default: "benin" })
  pays: string;
  @ApiProperty()
  @Column()
  nom: string;

  @ApiProperty()
  @Column()
  etablissement_id: number;

  @ApiProperty({ type: () => Etablissement })
  @ManyToOne(() => Etablissement)
  @JoinColumn({ name: 'etablissement_id' })
  etablissement: Etablissement;
}
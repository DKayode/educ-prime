import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('departements')
export class Departement {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, default: 'benin' })
  pays: string;

  @ApiProperty()
  @Column()
  nom: string;

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: 'varchar', length: 50, nullable: true })
  code: string | null;

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamp with time zone', name: 'date_creation' })
  date_creation: Date;
}

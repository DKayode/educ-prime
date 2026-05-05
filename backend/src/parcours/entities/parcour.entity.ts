import { ApiProperty } from '@nestjs/swagger';
import { Category } from 'src/categories/entities/category.entity';
import { Commentaire } from 'src/commentaires/entities/commentaire.entity';
import { Favori } from 'src/favoris/entities/favoris.entity';
import { Like } from 'src/likes/entities/like.entity';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
}

@Entity('parcours')
export class Parcour {
  @ApiProperty({ description: 'ID unique du parcours' })
  @PrimaryGeneratedColumn()
  id: number;



  @Column({ type: 'text', default: '' })
  covert_image_path: string;

  @Column({ type: 'varchar', length: 10, default: '' })
  covert_image_extension: string;

  @Column({ type: 'text', default: '' })
  content_image_path: string;

  @Column({ type: 'varchar', length: 10, default: '' })
  content_image_extension: string;
  @Column({ type: "varchar", length: 50, default: "benin" })
  pays: string;
  @ApiProperty({ description: 'UUID du parcours' })
  @Column({ type: 'uuid', unique: true, default: () => 'gen_random_uuid()' })
  uuid: string;

  @ApiProperty({ description: 'Titre du parcours' })
  @Column({ type: 'varchar', length: 255 })
  titre: string;

  @ApiProperty({ description: 'URL de l\'image de couverture', nullable: true })
  @Column({ type: 'varchar', length: 500, nullable: true })
  image_couverture: string;

  @ApiProperty({ description: 'URL du média', nullable: true })
  @Column({ type: 'varchar', length: 500, nullable: true })
  lien_video: string;

  @ApiProperty({ enum: MediaType, description: 'Type de média' })
  @Column({ type: 'enum', enum: MediaType })
  type_media: MediaType;

  @ApiProperty({ description: 'Catégorie du parcours', type: () => Category, required: false })
  @ManyToOne(() => Category, category => category.parcours, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @ApiProperty({ description: 'Description détaillée' })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({ description: 'Date de création' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Date de dernière modification' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => Commentaire, commentaire => commentaire.parcours)
  commentaires: Commentaire[];

  @OneToMany(() => Like, like => like.parcours)
  likes: Like[];

  @OneToMany(() => Favori, favori => favori.parcours)
  favoris: Favori[];

  // Champs calculés (non persistés)
  @ApiProperty({ description: 'Nombre de commentaires' })
  commentairesCount?: number;

  @ApiProperty({ description: 'Nombre de likes' })
  likesCount?: number;

  @ApiProperty({ description: 'Nombre de favoris' })
  favorisCount?: number;
}
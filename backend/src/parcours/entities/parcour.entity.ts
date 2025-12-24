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

  @ApiProperty({ description: 'Titre du parcours' })
  @Column({ type: 'varchar', length: 255 })
  titre: string;

  @ApiProperty({ description: 'URL de l\'image de couverture', nullable: true })
  @Column({ type: 'varchar', length: 500, nullable: true })
  image_couverture: string;

  @ApiProperty({ description: 'URL de la vidéo', nullable: true })
  @Column({ type: 'varchar', length: 500, nullable: true })
  lien_video: string;

  @ApiProperty({ enum: MediaType, description: 'Type de média' })
  @Column({ type: 'enum', enum: MediaType })
  type_media: MediaType;

  @ApiProperty({ description: 'Catégorie du parcours' })
  @Column({ type: 'varchar', length: 100 })
  categorie: string;

  @ApiProperty({ description: 'ID de la catégorie', required: false })
  @Column({ name: 'category_id', type: 'integer', nullable: true })
  category_id?: number;

  @ApiProperty({ description: 'Catégorie du parcours', type: () => Category, required: false })
  @ManyToOne(() => Category, category => category.parcours, { nullable: true })
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
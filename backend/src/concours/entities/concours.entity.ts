import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Structure } from '../../structure/entities/structure.entity';
import { Titre } from '../../titre/entities/titre.entity';
import { Utilisateur } from '../../utilisateurs/entities/utilisateur.entity';

@Entity('concours')
export class Concours {
    @PrimaryGeneratedColumn()
    id: number;



    @Column({ type: 'text', default: '' })
    file_path: string;

    @Column({ type: 'varchar', length: 10, default: '' })
    file_extension: string;
    @Column({ type: "varchar", length: 50, default: "benin" })
    pays: string;
    @Column({ type: 'uuid', unique: true, default: () => 'gen_random_uuid()' })
    uuid: string;

    // Free-text title column (legacy) — distinct from the `titre` lookup entity
    // referenced via `titre_id`/`titre_ref` below. Left untouched.
    @Column()
    titre: string;

    @Column({ type: 'text', nullable: true })
    url: string;

    @Column({ nullable: true })
    annee: number;

    @Column({ nullable: true })
    lieu: string;

    @Column({ default: 0 })
    nombre_page: number;

    @Column({ default: 0 })
    nombre_telechargements: number;

    // Approval state. User-submitted concours start 'pending_approval';
    // admin-created ones default to 'approved'. Values mirror ServiceStatusEnum.
    @Column({ type: 'varchar', length: 20, default: 'approved' })
    status: string;

    // Optional reference to the organizing body / institution (lookup entity).
    @ApiProperty({ required: false })
    @Column({ nullable: true })
    structure_id?: number;

    @ApiProperty({ type: () => Structure, required: false })
    @ManyToOne(() => Structure, { nullable: true })
    @JoinColumn({ name: 'structure_id' })
    structure?: Structure;

    // Optional reference to the post / title the concours recruits for (lookup
    // entity). Relation property is `titre_ref` to avoid clashing with the
    // free-text `titre` string column above; the DB FK column stays `titre_id`.
    @ApiProperty({ required: false })
    @Column({ nullable: true })
    titre_id?: number;

    @ApiProperty({ type: () => Titre, required: false })
    @ManyToOne(() => Titre, { nullable: true })
    @JoinColumn({ name: 'titre_id' })
    titre_ref?: Titre;

    // Uploader (the utilisateur who submitted a user-uploaded concours). Null
    // for admin-created and legacy rows. Used to email the approval decision.
    @ApiProperty({ required: false })
    @Column({ nullable: true })
    soumis_par_id?: number;

    @ApiProperty({ type: () => Utilisateur, required: false })
    @ManyToOne(() => Utilisateur, { nullable: true })
    @JoinColumn({ name: 'soumis_par_id' })
    soumis_par?: Utilisateur;
}

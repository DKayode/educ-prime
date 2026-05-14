import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, ManyToMany, JoinColumn, JoinTable } from 'typeorm';
import { Utilisateur } from '../../utilisateurs/entities/utilisateur.entity';
import { Competence } from '../../competences/entities/competence.entity';

@Entity('prestataires')
export class Prestataire {
    @PrimaryGeneratedColumn()
    id: number;



    @Column({ type: 'text', default: '' })
    profil_photo_path: string;

    @Column({ type: 'varchar', length: 10, default: '' })
    profil_photo_extension: string;

    @Column({ type: 'text', default: '' })
    identity_photo_path: string;

    @Column({ type: 'varchar', length: 10, default: '' })
    identity_photo_extension: string;
    @Column({ type: "varchar", length: 50, default: "benin" })
    pays: string;
    @Column({ type: 'uuid', unique: true, default: () => 'gen_random_uuid()' })
    uuid: string;

    @Column({ type: 'varchar', length: 100 })
    nom: string;

    @Column({ type: 'varchar', length: 100 })
    prenom: string;

    @Column({ name: 'utilisateur_id', unique: true })
    utilisateur_id: number;

    @Column({ nullable: true })
    photo_profil: string;

    @Column({ nullable: true })
    photo_identite: string;

    @Column({ type: 'text', nullable: true })
    biographie: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    domaine_competence: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    lien_portfolio: string;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at: Date;

    @OneToOne(() => Utilisateur, utilisateur => utilisateur.prestataire)
    @JoinColumn({ name: 'utilisateur_id' })
    utilisateur: Utilisateur;

    @ManyToMany(() => Competence, competence => competence.prestataires)
    @JoinTable({
        name: '_competencesToprestataires',
        joinColumn: { name: 'B', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'A', referencedColumnName: 'id' }
    })
    competences: Competence[];
}

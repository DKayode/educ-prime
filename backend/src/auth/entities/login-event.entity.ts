import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Une ligne par connexion réussie. Table en AJOUT SEUL : rien n'y est mis à
 * jour ni supprimé.
 *
 * refresh_tokens ne peut pas servir à mesurer les connexions : createRefreshToken
 * supprime la ligne précédente de l'appareil avant d'en insérer une nouvelle, si
 * bien qu'il ne reste que la DERNIÈRE connexion de chaque utilisateur. Une
 * personne qui revient chaque semaine n'apparaît alors que dans la dernière
 * période, et un même rapport rejoué plus tard donne un chiffre différent.
 */
@Entity('login_events')
export class LoginEvent {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: string;

    @Column({ name: 'utilisateur_id', type: 'int' })
    utilisateur_id: number;

    /** Pays du compte au moment de la connexion : les KPI sont scopés par pays. */
    @Column({ type: 'varchar', length: 50, default: 'benin' })
    pays: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    appareil?: string | null;

    /**
     * 'connexion' — identifiants saisis ; 'refresh' — session renouvelée sans
     * ressaisie. Le jeton d'accès dure 1 jour et celui de rafraîchissement 30 :
     * sans le second cas, une personne qui garde sa session ouverte n'aurait
     * produit aucune ligne, et les plus actifs auraient été les moins comptés.
     */
    @Column({ type: 'varchar', length: 20, default: 'connexion' })
    type: string;

    @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
    date_creation: Date;
}

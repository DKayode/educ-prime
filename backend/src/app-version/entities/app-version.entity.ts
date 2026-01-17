import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

export enum AppPlatform {
    ANDROID = 'android',
    IOS = 'ios',
}

@Entity('app_versions')
export class AppVersion {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        type: 'enum',
        enum: AppPlatform,
    })
    platform: AppPlatform;

    @Column()
    version: string;

    @Column({ name: 'minimum_required_version' })
    minimum_required_version: string;

    @Column({ name: 'update_url' })
    update_url: string;

    @Column({ name: 'force_update', default: false })
    force_update: boolean;

    @Column({ type: 'json', nullable: true, name: 'release_notes' })
    release_notes: { fr?: string; en?: string };

    @Column({ name: 'is_active', default: false })
    is_active: boolean;

    @CreateDateColumn({ name: 'created_at' })
    created_at: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updated_at: Date;
}

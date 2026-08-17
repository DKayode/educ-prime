import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PermissionProfile } from './permission-profile.entity';

@Entity('permission_profile_permissions')
@Index(['profileId', 'permission'], { unique: true })
export class PermissionProfilePermission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'profile_id' })
  profileId: number;

  @ManyToOne(() => PermissionProfile, (profile) => profile.permissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'profile_id' })
  profile: PermissionProfile;

  @Column({ type: 'varchar', length: 140 })
  permission: string;

  @CreateDateColumn()
  created_at: Date;
}
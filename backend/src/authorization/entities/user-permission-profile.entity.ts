import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PermissionProfile } from './permission-profile.entity';

@Entity('user_permission_profiles')
@Index(['userId', 'profileId'], { unique: true })
export class UserPermissionProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'profile_id' })
  profileId: number;

  @ManyToOne(() => PermissionProfile, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'profile_id' })
  profile: PermissionProfile;

  @CreateDateColumn()
  created_at: Date;
}
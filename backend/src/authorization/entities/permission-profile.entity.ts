import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { PermissionProfilePermission } from './permission-profile-permission.entity';

@Entity('permission_profiles')
export class PermissionProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 80, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 120 })
  label: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'boolean', default: false })
  is_system: boolean;

  @OneToMany(() => PermissionProfilePermission, (permission) => permission.profile, {
    cascade: true,
  })
  permissions: PermissionProfilePermission[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../auth/permissions/permission.enum';
import { ROLE_PERMISSIONS } from '../auth/permissions/role-permissions.map';
import { RoleType, Utilisateur } from '../utilisateurs/entities/utilisateur.entity';
import { CreatePermissionProfileDto } from './dto/create-permission-profile.dto';
import { UpdatePermissionProfileDto } from './dto/update-permission-profile.dto';
import { PermissionProfilePermission } from './entities/permission-profile-permission.entity';
import { PermissionProfile } from './entities/permission-profile.entity';
import { UserPermissionProfile } from './entities/user-permission-profile.entity';

@Injectable()
export class AuthorizationService {
  constructor(
    @InjectRepository(PermissionProfile)
    private readonly profiles: Repository<PermissionProfile>,
    @InjectRepository(PermissionProfilePermission)
    private readonly profilePermissions: Repository<PermissionProfilePermission>,
    @InjectRepository(UserPermissionProfile)
    private readonly userProfiles: Repository<UserPermissionProfile>,
    @InjectRepository(Utilisateur)
    private readonly users: Repository<Utilisateur>,
  ) {}

  listPermissions(): Permission[] {
    return Object.values(Permission);
  }

  async listProfiles() {
    return this.profiles.find({ relations: ['permissions'], order: { id: 'ASC' } });
  }

  async getProfile(id: number) {
    const profile = await this.profiles.findOne({ where: { id }, relations: ['permissions'] });
    if (!profile) throw new NotFoundException('Profil de permissions introuvable');
    return profile;
  }

  async createProfile(dto: CreatePermissionProfileDto) {
    this.assertKnownPermissions(dto.permissions);

    const profile = await this.profiles.save(
      this.profiles.create({
        code: dto.code,
        label: dto.label,
        description: dto.description,
        is_system: dto.is_system ?? false,
      }),
    );

    await this.replaceProfilePermissions(profile.id, dto.permissions);
    return this.getProfile(profile.id);
  }

  async updateProfile(id: number, dto: UpdatePermissionProfileDto) {
    const profile = await this.getProfile(id);
    if (dto.permissions) this.assertKnownPermissions(dto.permissions);

    await this.profiles.save({
      ...profile,
      code: dto.code ?? profile.code,
      label: dto.label ?? profile.label,
      description: dto.description ?? profile.description,
      is_system: dto.is_system ?? profile.is_system,
    });

    if (dto.permissions) {
      await this.replaceProfilePermissions(id, dto.permissions);
    }

    return this.getProfile(id);
  }

  async deleteProfile(id: number) {
    const profile = await this.getProfile(id);
    if (profile.is_system) {
      throw new BadRequestException('Impossible de supprimer un profil systeme');
    }

    await this.profiles.delete(id);
    return { deleted: true };
  }

  async assignProfile(userId: number, profileId: number) {
    await this.assertUserExists(userId);
    await this.getProfile(profileId);

    const existing = await this.userProfiles.findOne({ where: { userId, profileId } });
    if (existing) return existing;

    const assignment = await this.userProfiles.save(this.userProfiles.create({ userId, profileId }));
    await this.bumpTokenVersion(userId);
    return assignment;
  }

  async removeProfileFromUser(userId: number, profileId: number) {
    const result = await this.userProfiles.delete({ userId, profileId });
    if ((result.affected ?? 0) > 0) {
      await this.bumpTokenVersion(userId);
    }
    return { removed: true };
  }

  async getUserAuthorization(userId: number) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const permissions = await this.getUserPermissions(userId, user.role);
    let profiles: PermissionProfile[] = [];

    try {
      const assignments = await this.userProfiles.find({
        where: { userId },
        relations: ['profile', 'profile.permissions'],
        order: { id: 'ASC' },
      });
      profiles = assignments.map((assignment) => assignment.profile).filter(Boolean);
    } catch {
      profiles = [];
    }

    return { userId, role: user.role, profiles, permissions };
  }

  async getUserPermissions(userId: number | undefined, role: RoleType): Promise<Permission[]> {
    const rolePermissions = ROLE_PERMISSIONS[role] ?? [];
    if (!userId) return rolePermissions;

    try {
      const assignments = await this.userProfiles.find({
        where: { userId },
        relations: ['profile', 'profile.permissions'],
      });
      const profilePermissions = assignments.flatMap((assignment) =>
        assignment.profile?.permissions?.map((permission) => permission.permission as Permission) ?? [],
      );

      return Array.from(new Set([...rolePermissions, ...profilePermissions]));
    } catch {
      // Transitional fallback: before DB migration is applied, permissions keep
      // working from role mapping instead of breaking every protected route.
      return rolePermissions;
    }
  }

  async userHasPermissions(userId: number | undefined, role: RoleType, requiredPermissions: Permission[]) {
    const permissions = await this.getUserPermissions(userId, role);
    return requiredPermissions.every((permission) => permissions.includes(permission));
  }

  private async assertUserExists(userId: number) {
    const exists = await this.users.exist({ where: { id: userId } });
    if (!exists) throw new NotFoundException('Utilisateur introuvable');
  }

  private async bumpTokenVersion(userId: number) {
    await this.users.increment({ id: userId }, 'token_version', 1);
  }

  private assertKnownPermissions(permissions: Permission[]) {
    const known = new Set(Object.values(Permission));
    const unknown = permissions.filter((permission) => !known.has(permission));
    if (unknown.length > 0) {
      throw new BadRequestException(`Permissions inconnues: ${unknown.join(', ')}`);
    }
  }

  private async replaceProfilePermissions(profileId: number, permissions: Permission[]) {
    await this.profilePermissions.delete({ profileId });
    if (permissions.length === 0) return;

    await this.profilePermissions.save(
      permissions.map((permission) =>
        this.profilePermissions.create({ profileId, permission }),
      ),
    );
  }
}
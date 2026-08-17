import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Utilisateur } from '../utilisateurs/entities/utilisateur.entity';
import { AuthorizationController } from './authorization.controller';
import { AuthorizationService } from './authorization.service';
import { PermissionProfilePermission } from './entities/permission-profile-permission.entity';
import { PermissionProfile } from './entities/permission-profile.entity';
import { UserPermissionProfile } from './entities/user-permission-profile.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([PermissionProfile, PermissionProfilePermission, UserPermissionProfile, Utilisateur])],
  controllers: [AuthorizationController],
  providers: [AuthorizationService],
  exports: [AuthorizationService],
})
export class AuthorizationModule {}
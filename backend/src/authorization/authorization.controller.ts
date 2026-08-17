import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/permissions/permissions.decorator';
import { Permission } from '../auth/permissions/permission.enum';
import { PermissionsGuard } from '../auth/permissions/permissions.guard';
import { AssignPermissionProfileDto } from './dto/assign-permission-profile.dto';
import { CreatePermissionProfileDto } from './dto/create-permission-profile.dto';
import { UpdatePermissionProfileDto } from './dto/update-permission-profile.dto';
import { AuthorizationService } from './authorization.service';

@ApiTags('authorization')
@ApiBearerAuth()
@Controller('authorization')
@UseGuards(JwtAuthGuard)
export class AuthorizationController {
  constructor(private readonly authorizationService: AuthorizationService) {}

  @Get('me/permissions')
  @ApiOperation({ summary: 'Consulter mes permissions effectives' })
  getMyAuthorization(@Req() req: any) {
    return this.authorizationService.getUserAuthorization(req.user.utilisateurId);
  }

  @Get('permissions')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.AUTHORIZATION_MANAGE)
  @ApiOperation({ summary: 'Lister les permissions applicatives disponibles' })
  listPermissions() {
    return this.authorizationService.listPermissions();
  }

  @Get('profiles')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.AUTHORIZATION_MANAGE)
  @ApiOperation({ summary: 'Lister les profils de permissions' })
  listProfiles() {
    return this.authorizationService.listProfiles();
  }

  @Post('profiles')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.AUTHORIZATION_MANAGE)
  @ApiOperation({ summary: 'Creer un profil de permissions' })
  createProfile(@Body() dto: CreatePermissionProfileDto) {
    return this.authorizationService.createProfile(dto);
  }

  @Get('profiles/:id')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.AUTHORIZATION_MANAGE)
  @ApiOperation({ summary: 'Consulter un profil de permissions' })
  getProfile(@Param('id', ParseIntPipe) id: number) {
    return this.authorizationService.getProfile(id);
  }

  @Patch('profiles/:id')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.AUTHORIZATION_MANAGE)
  @ApiOperation({ summary: 'Modifier un profil de permissions' })
  updateProfile(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePermissionProfileDto) {
    return this.authorizationService.updateProfile(id, dto);
  }

  @Delete('profiles/:id')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.AUTHORIZATION_MANAGE)
  @ApiOperation({ summary: 'Supprimer un profil de permissions non systeme' })
  deleteProfile(@Param('id', ParseIntPipe) id: number) {
    return this.authorizationService.deleteProfile(id);
  }

  @Post('users/:userId/profiles')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.AUTHORIZATION_MANAGE)
  @ApiOperation({ summary: 'Assigner un profil de permissions a un utilisateur' })
  assignProfile(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: AssignPermissionProfileDto,
  ) {
    return this.authorizationService.assignProfile(userId, dto.profileId);
  }

  @Delete('users/:userId/profiles/:profileId')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.AUTHORIZATION_MANAGE)
  @ApiOperation({ summary: 'Retirer un profil de permissions a un utilisateur' })
  removeProfile(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('profileId', ParseIntPipe) profileId: number,
  ) {
    return this.authorizationService.removeProfileFromUser(userId, profileId);
  }

  @Get('users/:userId/permissions')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.AUTHORIZATION_MANAGE)
  @ApiOperation({ summary: 'Consulter les permissions effectives d un utilisateur' })
  getUserAuthorization(@Param('userId', ParseIntPipe) userId: number) {
    return this.authorizationService.getUserAuthorization(userId);
  }
}
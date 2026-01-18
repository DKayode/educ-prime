import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Headers,
    Query,
    DefaultValuePipe,
    ParseIntPipe,
    ParseBoolPipe,
    Put,
    BadRequestException,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiHeader, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { AppVersionService } from './app-version.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from '../utilisateurs/entities/utilisateur.entity';
import { CreateAppVersionDto } from './dto/create-app-version.dto';
import { UpdateAppVersionDto } from './dto/update-app-version.dto';
import { CheckVersionResponseDto } from './dto/check-version-response.dto';
import { FilterAppVersionDto } from './dto/filter-app-version.dto';
import { AppVersionPaginationDto } from './dto/app-version-pagination.dto';
import { AppPlatform, AppVersion } from './entities/app-version.entity';

@ApiTags('Version App')
@Controller('app/version')
export class AppVersionController {
    constructor(private readonly appVersionService: AppVersionService) { }

    @Get('check')
    @ApiOperation({ summary: "Vérifier si une mise à jour de l'application est requise" })
    @ApiHeader({ name: 'x-app-version', description: "Version actuelle de l'application (x.y.z)", required: true })
    @ApiHeader({ name: 'x-platform', description: 'Plateforme (android ou ios)', enum: AppPlatform, required: true })
    @ApiResponse({ status: 200, type: CheckVersionResponseDto })
    check(
        @Headers('x-app-version') currentVersion: string,
        @Headers('x-platform') platform: AppPlatform,
    ) {
        if (!currentVersion || !platform) {
            // Ideally use a DTO or specific pipe, but manual check for now
            throw new BadRequestException('Missing X-App-Version or X-Platform headers');
        }
        // Simple validation of platform enum
        if (!Object.values(AppPlatform).includes(platform)) {
            throw new BadRequestException('Invalid platform');
        }

        return this.appVersionService.checkVersion(platform, currentVersion);
    }

    // --- Admin Endpoints ---

    @Get('admin')
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(RoleType.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Lister les versions (Admin)' })
    @ApiResponse({ status: 200, type: AppVersionPaginationDto })
    findAll(@Query() filterDto: FilterAppVersionDto) {
        return this.appVersionService.findAll(filterDto);
    }

    @Post('admin')
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(RoleType.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Créer une nouvelle version (Admin)' })
    @ApiResponse({ status: 201, type: AppVersion })
    create(@Body() createAppVersionDto: CreateAppVersionDto) {
        return this.appVersionService.create(createAppVersionDto);
    }

    @Put('admin/:id')
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(RoleType.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Mettre à jour une version (Admin)' })
    @ApiResponse({ status: 200, type: AppVersion })
    update(
        @Param('id') id: string,
        @Body() updateAppVersionDto: UpdateAppVersionDto,
    ) {
        return this.appVersionService.update(id, updateAppVersionDto);
    }

    @Delete('admin/:id')
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(RoleType.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Supprimer une version (Admin)' })
    @ApiResponse({ status: 200, schema: { type: 'object', properties: { message: { type: 'string' } } } })
    remove(@Param('id') id: string) {
        return this.appVersionService.remove(id);
    }
}

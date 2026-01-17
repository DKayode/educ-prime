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
} from '@nestjs/common';
import { ApiTags, ApiHeader, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AppVersionService } from './app-version.service';
import { CreateAppVersionDto } from './dto/create-app-version.dto';
import { UpdateAppVersionDto } from './dto/update-app-version.dto';
import { CheckVersionResponseDto } from './dto/check-version-response.dto';
import { FilterAppVersionDto } from './dto/filter-app-version.dto';
import { AppPlatform } from './entities/app-version.entity';

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
    // In a real app, these should be protected by AuthGuards (e.g. @UseGuards(JwtAuthGuard, RolesGuard))
    // Assuming 'admin' in path is just a convention for this task, but usually it implies specific access.

    @Get('admin')
    @ApiOperation({ summary: 'Lister les versions (Admin)' })
    findAll(@Query() filterDto: FilterAppVersionDto) {
        return this.appVersionService.findAll(filterDto);
    }

    @Post('admin')
    @ApiOperation({ summary: 'Créer une nouvelle version (Admin)' })
    create(@Body() createAppVersionDto: CreateAppVersionDto) {
        return this.appVersionService.create(createAppVersionDto);
    }

    @Put('admin/:id')
    @ApiOperation({ summary: 'Mettre à jour une version (Admin)' })
    update(
        @Param('id') id: string,
        @Body() updateAppVersionDto: UpdateAppVersionDto,
    ) {
        return this.appVersionService.update(id, updateAppVersionDto);
    }

    @Delete('admin/:id')
    @ApiOperation({ summary: 'Supprimer une version (Admin)' })
    remove(@Param('id') id: string) {
        return this.appVersionService.remove(id);
    }
}

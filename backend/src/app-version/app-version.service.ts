import {
    BadRequestException,
    Injectable,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppVersion, AppPlatform } from './entities/app-version.entity';
import { PaginationResponse } from '../common/interfaces/pagination-response.interface';
import { CreateAppVersionDto } from './dto/create-app-version.dto';
import { UpdateAppVersionDto } from './dto/update-app-version.dto';
import { CheckVersionResponseDto } from './dto/check-version-response.dto';
import { FilterAppVersionDto } from './dto/filter-app-version.dto';

@Injectable()
export class AppVersionService {
    constructor(
        @InjectRepository(AppVersion)
        private readonly appVersionRepository: Repository<AppVersion>,
    ) { }

    /**
     * Compare two semantic versions (x.y.z).
     * Returns:
     *  1 if v1 > v2
     * -1 if v1 < v2
     *  0 if v1 == v2
     */
    compareVersions(v1: string, v2: string): number {
        const v1Parts = v1.split('.').map(Number);
        const v2Parts = v2.split('.').map(Number);

        for (let i = 0; i < 3; i++) {
            const part1 = v1Parts[i] || 0;
            const part2 = v2Parts[i] || 0;

            if (part1 > part2) return 1;
            if (part1 < part2) return -1;
        }
        return 0;
    }

    determineUpdateType(
        current: string,
        latest: string,
        minRequired: string,
    ): 'required' | 'optional' | 'up_to_date' {
        if (this.compareVersions(current, minRequired) < 0) {
            return 'required';
        }
        if (this.compareVersions(current, latest) < 0) {
            return 'optional';
        }
        return 'up_to_date';
    }

    async checkVersion(
        platform: AppPlatform,
        currentVersion: string,
    ): Promise<CheckVersionResponseDto> {
        // Ideally, we fetch the version marked as 'active' for the platform
        // OR the version with the highest version number that is active.
        // The requirement implies "a specific version... when set to active, all others... set to false".
        // So there is at most ONE active version per platform.
        const activeVersion = await this.appVersionRepository.findOne({
            where: { platform, is_active: true },
        });

        if (!activeVersion) {
            throw new NotFoundException('No active version found for this platform');
        }

        const updateType = this.determineUpdateType(
            currentVersion,
            activeVersion.version,
            activeVersion.minimum_required_version,
        );

        return {
            current_version: currentVersion,
            latest_version: activeVersion.version,
            update_type: updateType,
            update_url: activeVersion.update_url,
            force_update: activeVersion.force_update,
            messages: {
                fr: `Une nouvelle version (${activeVersion.version}) est disponible. Souhaitez-vous mettre à jour ?`,
                en: `A new version (${activeVersion.version}) is available. Would you like to update?`,
            },
            release_notes: activeVersion.release_notes || { fr: '', en: '' },
        };
    }

    // --- Admin Methods ---

    async create(createAppVersionDto: CreateAppVersionDto): Promise<AppVersion> {
        // Enforce uniqueness: version number per platform
        const existing = await this.appVersionRepository.findOne({
            where: {
                platform: createAppVersionDto.platform,
                version: createAppVersionDto.version,
            },
        });

        if (existing) {
            throw new ConflictException(
                `Version ${createAppVersionDto.version} already exists for platform ${createAppVersionDto.platform}`,
            );
        }

        if (createAppVersionDto.is_active) {
            await this.deactivateOthers(createAppVersionDto.platform);
        }

        const appVersion = this.appVersionRepository.create(createAppVersionDto);
        return this.appVersionRepository.save(appVersion);
    }

    async findAll(
        filterDto: FilterAppVersionDto,
    ): Promise<PaginationResponse<AppVersion>> {
        const { platform, is_active, limit = 10, page = 1 } = filterDto;
        const offset = (page - 1) * limit;

        const query = this.appVersionRepository.createQueryBuilder('version');

        if (platform) {
            query.andWhere('version.platform = :platform', { platform });
        }

        if (is_active !== undefined) {
            query.andWhere('version.is_active = :isActive', { isActive: is_active });
        }

        query.skip(offset).take(limit).orderBy('version.created_at', 'DESC');

        const [data, total] = await query.getManyAndCount();

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: string): Promise<AppVersion> {
        const appVersion = await this.appVersionRepository.findOneBy({ id });
        if (!appVersion) {
            throw new NotFoundException(`AppVersion with ID ${id} not found`);
        }
        return appVersion;
    }

    async update(
        id: string,
        updateAppVersionDto: UpdateAppVersionDto,
    ): Promise<AppVersion> {
        const appVersion = await this.findOne(id);

        if (updateAppVersionDto.is_active === true && !appVersion.is_active) {
            await this.deactivateOthers(appVersion.platform);
        }

        Object.assign(appVersion, updateAppVersionDto);
        return this.appVersionRepository.save(appVersion);
    }

    async remove(id: string): Promise<{ message: string }> {
        const appVersion = await this.findOne(id);

        if (appVersion.is_active) {
            throw new BadRequestException(
                'Cannot delete the active version. Please activate another version first.',
            );
        }

        await this.appVersionRepository.remove(appVersion);
        return { message: 'Version deleted successfully' };
    }

    private async deactivateOthers(platform: AppPlatform): Promise<void> {
        await this.appVersionRepository
            .createQueryBuilder()
            .update(AppVersion)
            .set({ is_active: false })
            .where('platform = :platform', { platform })
            .andWhere('is_active = :isActive', { isActive: true })
            .execute();
    }
}

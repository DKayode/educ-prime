import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    UploadedFile,
    UseGuards,
    UseInterceptors,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
    ApiBearerAuth,
    ApiBody,
    ApiConsumes,
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FilesService } from './files.service';
import { UploadUrlRequestDto } from './dto/upload-url.dto';

@ApiTags('files')
@Controller('files')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FilesController {
    constructor(private readonly filesService: FilesService) { }

    @Post(':entity/:uuid/:slot/upload-url')
    @ApiOperation({
        summary: 'Get a presigned PUT URL for direct R2 upload',
        description:
            'Validates the requested extension against the slot allowlist, ' +
            'records the path/extension on the entity row, and returns a short-lived ' +
            'presigned URL. Client uploads bytes directly to R2 with the returned URL.',
    })
    @ApiParam({ name: 'entity', example: 'categories' })
    @ApiParam({ name: 'uuid', description: 'UUID of the row that owns the file' })
    @ApiParam({ name: 'slot', example: 'icone' })
    @ApiResponse({ status: 201, description: 'Presigned URL issued.' })
    @ApiResponse({ status: 400, description: 'Extension not in the slot allowlist.' })
    @ApiResponse({ status: 404, description: 'Unknown entity/slot or row uuid not found.' })
    async createUploadUrl(
        @Param('entity') entity: string,
        @Param('uuid') uuid: string,
        @Param('slot') slot: string,
        @Body() body: UploadUrlRequestDto,
    ) {
        return this.filesService.createUploadUrl(entity, uuid, slot, body.extension);
    }

    @Post(':entity/:uuid/:slot/upload')
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: { file: { type: 'string', format: 'binary' } },
        },
    })
    @ApiOperation({
        summary: 'Server-proxied upload (fallback path)',
        description:
            'Accepts a multipart/form-data file under the `file` field, streams it to R2, ' +
            'and updates the entity row. Use this when the client can\'t use the presigned ' +
            'URL flow. Extension is inferred from the uploaded filename.',
    })
    @ApiParam({ name: 'entity', example: 'categories' })
    @ApiParam({ name: 'uuid', description: 'UUID of the row that owns the file' })
    @ApiParam({ name: 'slot', example: 'icone' })
    async proxyUpload(
        @Param('entity') entity: string,
        @Param('uuid') uuid: string,
        @Param('slot') slot: string,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) throw new BadRequestException('Missing file (field name: "file").');
        return this.filesService.proxyUpload(entity, uuid, slot, file);
    }

    @Get(':entity/:uuid/:slot/download-url')
    @ApiOperation({
        summary: 'Get a presigned GET URL for direct R2 download',
        description:
            'Reads the path/extension recorded on the entity row, returns a short-lived ' +
            'presigned URL. Returns 404 if no file has been uploaded for this slot yet.',
    })
    @ApiParam({ name: 'entity', example: 'categories' })
    @ApiParam({ name: 'uuid', description: 'UUID of the row that owns the file' })
    @ApiParam({ name: 'slot', example: 'icone' })
    async createDownloadUrl(
        @Param('entity') entity: string,
        @Param('uuid') uuid: string,
        @Param('slot') slot: string,
    ) {
        return this.filesService.createDownloadUrl(entity, uuid, slot);
    }
}

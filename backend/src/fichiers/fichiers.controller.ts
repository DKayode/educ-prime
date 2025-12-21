import { Controller, Post, Get, Delete, UseGuards, UseInterceptors, UploadedFile, Request, Body, Query, Res, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as multer from 'multer';
import { FichiersService } from './fichiers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TypeFichier, TypeRessource } from './entities/fichier.entity';
import { CreerFichierDto } from './dto/creer-fichier.dto';
import { FichierUploadData } from './interfaces/fichier-upload-data.interface';

@Controller('fichiers')
export class FichiersController {
  constructor(private readonly fichiersService: FichiersService) { }

  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  @UseGuards(JwtAuthGuard)
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
    @Body() body: CreerFichierDto
  ) {
    if (!req.user || !req.user.utilisateurId) {
      throw new Error('ID utilisateur introuvable dans le payload JWT');
    }

    // Convert string fields from FormData to numbers for the service
    const uploadData: FichierUploadData = {
      type: body.type,
      typeRessource: body.typeRessource,
      matiereId: body.matiereId ? Number(body.matiereId) : undefined,
      epreuveId: body.epreuveId ? Number(body.epreuveId) : undefined,
      ressourceId: body.ressourceId ? Number(body.ressourceId) : undefined,
      epreuveTitre: body.epreuveTitre,
      epreuveType: body.epreuveType,
      dureeMinutes: body.dureeMinutes ? Number(body.dureeMinutes) : undefined,
      nombrePages: body.nombrePages ? Number(body.nombrePages) : undefined,
      datePublication: body.datePublication,
      ressourceTitre: body.ressourceTitre,
      entityId: body.entityId ? Number(body.entityId) : undefined,
      entitySubtype: body.entitySubtype,
    };

    return this.fichiersService.uploadFile(file, req.user.utilisateurId, uploadData);
  }

  @Get('telechargement')
  @UseGuards(JwtAuthGuard)
  async downloadFile(
    @Query('url') fileUrl: string,
    @Res() res: Response
  ) {
    const { buffer, contentType, filename } = await this.fichiersService.downloadFile(fileUrl);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).send(buffer);
  }

  @Delete('')
  @UseGuards(JwtAuthGuard)
  async deleteFile(@Query('url') fileUrl: string) {
    if (!fileUrl) {
      throw new Error('URL is required');
    }
    await this.fichiersService.deleteFile(fileUrl);
    return { message: 'File deleted successfully' };
  }

  @Post('delete')
  // @Delete() // issue sending body with delete in some clients/proxies, using POST for safety or query param with DELETE
  // Let's use standard DELETE with query param for simple URL
  // @Delete()
  // But wait, user plan said DELETE / ?url=...
  // Let's explicitly map it.
  async deleteFileAndReturn(@Query('url') fileUrl: string) {
    // Temporary method for internal testing or manual cleanup if needed
    // Actually, per plan: "Add DELETE / endpoint... taking url in query".
    return { message: 'Use the dedicated delete method via service interactions' };
  }
}
import { Controller, Post, Get, UseGuards, UseInterceptors, UploadedFile, Request, Body, Query, Res, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as multer from 'multer';
import { FichiersService } from './fichiers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TypeFichier, TypeRessource } from './entities/fichier.entity';
import { CreerFichierDto } from './dto/creer-fichier.dto';

@Controller('fichiers')
export class FichiersController {
  constructor(private readonly fichiersService: FichiersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
    @Body() creerFichierDto: CreerFichierDto
  ) {
    if (!req.user || !req.user.utilisateurId) {
      throw new Error('User ID not found in JWT payload');
    }

    return this.fichiersService.uploadFile(file, req.user.utilisateurId, creerFichierDto);
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
}
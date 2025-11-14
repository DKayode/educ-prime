import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Filiere } from './entities/filiere.entity';
import { CreerFiliereDto } from './dto/creer-filiere.dto';
import { MajFiliereDto } from './dto/maj-filiere.dto';

@Injectable()
export class FilieresService {
  constructor(
    @InjectRepository(Filiere)
    private readonly filieresRepository: Repository<Filiere>,
  ) {}

  async create(creerFiliereDto: CreerFiliereDto) {
    const newFiliere = this.filieresRepository.create({
      nom: creerFiliereDto.nom,
      etablissement: { id: creerFiliereDto.etablissement_id } as any,
    });
    return await this.filieresRepository.save(newFiliere);
  }

  async findAll() {
    return await this.filieresRepository.find({
      relations: ['etablissement', 'niveaux_etude'],
    });
  }

  async findOne(id: string) {
    const filiere = await this.filieresRepository.findOne({
      where: { id: parseInt(id) },
      relations: ['etablissement', 'niveaux_etude'],
    });

    if (!filiere) {
      throw new NotFoundException('Filière non trouvée');
    }

    return filiere;
  }

  async update(id: string, majFiliereDto: MajFiliereDto) {
    const filiere = await this.filieresRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!filiere) {
      throw new NotFoundException('Filière non trouvée');
    }

    if (majFiliereDto.nom) {
      filiere.nom = majFiliereDto.nom;
    }

    if (majFiliereDto.etablissement_id) {
      filiere.etablissement = { id: majFiliereDto.etablissement_id } as any;
    }

    return await this.filieresRepository.save(filiere);
  }

  async remove(id: string) {
    const filiere = await this.filieresRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!filiere) {
      throw new NotFoundException('Filière non trouvée');
    }

    await this.filieresRepository.remove(filiere);
    return { message: 'Filière supprimée avec succès' };
  }

  async findByEtablissement(etablissementId: string) {
    return await this.filieresRepository.find({
      where: { etablissement: { id: parseInt(etablissementId) } },
      relations: ['niveaux_etude'],
    });
  }
}
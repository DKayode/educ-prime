import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Matiere } from './entities/matiere.entity';
import { CreerMatiereDto } from './dto/creer-matiere.dto';
import { MajMatiereDto } from './dto/maj-matiere.dto';

@Injectable()
export class MatieresService {
  constructor(
    @InjectRepository(Matiere)
    private readonly matieresRepository: Repository<Matiere>,
  ) {}

  async create(creerMatiereDto: CreerMatiereDto) {
    const newMatiere = new Matiere();
    newMatiere.nom = creerMatiereDto.nom;
    newMatiere.description = creerMatiereDto.description;
    newMatiere.niveau_etude_id = creerMatiereDto.niveau_etude_id;
    newMatiere.filiere_id = creerMatiereDto.filiere_id;
    return await this.matieresRepository.save(newMatiere);
  }

  async findAll() {
    return await this.matieresRepository.find({
      relations: ['niveau_etude', 'epreuves', 'ressources'],
    });
  }

  async findOne(id: string) {
    const matiere = await this.matieresRepository.findOne({
      where: { id: parseInt(id) },
      relations: ['niveau_etude', 'epreuves', 'ressources'],
    });

    if (!matiere) {
      throw new NotFoundException('Matière non trouvée');
    }

    return matiere;
  }

  async update(id: string, majMatiereDto: MajMatiereDto) {
    const matiere = await this.matieresRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!matiere) {
      throw new NotFoundException('Matière non trouvée');
    }

    Object.assign(matiere, majMatiereDto);
    return await this.matieresRepository.save(matiere);
  }

  async remove(id: string) {
    const matiere = await this.matieresRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!matiere) {
      throw new NotFoundException('Matière non trouvée');
    }

    await this.matieresRepository.remove(matiere);
    return { message: 'Matière supprimée avec succès' };
  }

  async findByNiveauEtude(niveauEtudeId: string) {
    return await this.matieresRepository.find({
      where: { niveau_etude: { id: parseInt(niveauEtudeId) } },
      relations: ['epreuves', 'ressources'],
    });
  }
}
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ressource, RessourceType } from './entities/ressource.entity';
import { CreerRessourceDto } from './dto/creer-ressource.dto';
import { MajRessourceDto } from './dto/maj-ressource.dto';

@Injectable()
export class RessourcesService {
  constructor(
    @InjectRepository(Ressource)
    private readonly ressourcesRepository: Repository<Ressource>,
  ) {}

  async create(creerRessourceDto: CreerRessourceDto, professeurId: number) {
    const newRessource = new Ressource();
    newRessource.titre = creerRessourceDto.titre;
    newRessource.type = creerRessourceDto.type;
    newRessource.url = creerRessourceDto.url;
    newRessource.matiere_id = creerRessourceDto.matiere_id;
    newRessource.professeur_id = professeurId;
    newRessource.date_publication = creerRessourceDto.date_publication;
    return await this.ressourcesRepository.save(newRessource);
  }

  async findAll() {
    return await this.ressourcesRepository.find({
      relations: ['matiere', 'professeur'],
      order: {
        date_creation: 'DESC',
      },
    });
  }

  async findOne(id: string) {
    const ressource = await this.ressourcesRepository.findOne({
      where: { id: parseInt(id) },
      relations: ['matiere', 'professeur'],
    });

    if (!ressource) {
      throw new NotFoundException('Ressource non trouvée');
    }

    return ressource;
  }

  async update(id: string, majRessourceDto: MajRessourceDto) {
    const ressource = await this.ressourcesRepository.findOne({
      where: { id: parseInt(id) },
      relations: ['professeur'],
    });

    if (!ressource) {
      throw new NotFoundException('Ressource non trouvée');
    }

    Object.assign(ressource, majRessourceDto);
    return await this.ressourcesRepository.save(ressource);
  }

  async remove(id: string) {
    const ressource = await this.ressourcesRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!ressource) {
      throw new NotFoundException('Ressource non trouvée');
    }

    await this.ressourcesRepository.remove(ressource);
    return { message: 'Ressource supprimée avec succès' };
  }

  async findByMatiere(matiereId: string) {
    return await this.ressourcesRepository.find({
      where: { matiere: { id: parseInt(matiereId) } },
      relations: ['professeur'],
      order: {
        date_creation: 'DESC',
      },
    });
  }

  async findByProfesseur(professeurId: string) {
    return await this.ressourcesRepository.find({
      where: { professeur: { id: parseInt(professeurId) } },
      relations: ['matiere'],
      order: {
        date_creation: 'DESC',
      },
    });
  }

  async findByType(type: string) {
    return await this.ressourcesRepository.find({
      where: { type: type as RessourceType },
      relations: ['matiere', 'professeur'],
      order: {
        date_creation: 'DESC',
      },
    });
  }
}
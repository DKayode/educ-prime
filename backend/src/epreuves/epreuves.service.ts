import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Epreuve } from './entities/epreuve.entity';
import { CreerEpreuveDto } from './dto/creer-epreuve.dto';
import { MajEpreuveDto } from './dto/maj-epreuve.dto';

@Injectable()
export class EpreuvesService {
  constructor(
    @InjectRepository(Epreuve)
    private readonly epreuvesRepository: Repository<Epreuve>,
  ) {}

  async create(creerEpreuveDto: CreerEpreuveDto, professeurId: number) {
    const newEpreuve = new Epreuve();
    newEpreuve.titre = creerEpreuveDto.titre;
    newEpreuve.url = creerEpreuveDto.url;
    newEpreuve.duree_minutes = creerEpreuveDto.duree_minutes;
    newEpreuve.matiere_id = creerEpreuveDto.matiere_id;
    newEpreuve.professeur_id = professeurId;
    newEpreuve.date_publication = creerEpreuveDto.date_publication;
    return await this.epreuvesRepository.save(newEpreuve);
  }

  async findAll() {
    return await this.epreuvesRepository.find({
      relations: ['matiere', 'professeur'],
      order: {
        date_creation: 'DESC',
      },
    });
  }

  async findOne(id: string) {
    const epreuve = await this.epreuvesRepository.findOne({
      where: { id: parseInt(id) },
      relations: ['matiere', 'professeur'],
    });

    if (!epreuve) {
      throw new NotFoundException('Épreuve non trouvée');
    }

    return epreuve;
  }

  async update(id: string, majEpreuveDto: MajEpreuveDto) {
    const epreuve = await this.epreuvesRepository.findOne({
      where: { id: parseInt(id) },
      relations: ['professeur'],
    });

    if (!epreuve) {
      throw new NotFoundException('Épreuve non trouvée');
    }

    Object.assign(epreuve, majEpreuveDto);
    return await this.epreuvesRepository.save(epreuve);
  }

  async remove(id: string) {
    const epreuve = await this.epreuvesRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!epreuve) {
      throw new NotFoundException('Épreuve non trouvée');
    }

    await this.epreuvesRepository.remove(epreuve);
    return { message: 'Épreuve supprimée avec succès' };
  }

  async findByMatiere(matiereId: string) {
    return await this.epreuvesRepository.find({
      where: { matiere: { id: parseInt(matiereId) } },
      relations: ['professeur'],
      order: {
        date_creation: 'DESC',
      },
    });
  }

  async findByProfesseur(professeurId: string) {
    return await this.epreuvesRepository.find({
      where: { professeur: { id: parseInt(professeurId) } },
      relations: ['matiere'],
      order: {
        date_creation: 'DESC',
      },
    });
  }
}
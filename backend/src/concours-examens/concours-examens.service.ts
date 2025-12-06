import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConcoursExamen } from './entities/concours-examen.entity';
import { CreerConcoursExamenDto } from './dto/create-concours-examen.dto';
import { UpdateConcoursExamenDto } from './dto/update-concours-examen.dto';

@Injectable()
export class ConcoursExamensService {
  private readonly logger = new Logger(ConcoursExamensService.name);

  constructor(
    @InjectRepository(ConcoursExamen)
    private readonly concoursExamenRepository: Repository<ConcoursExamen>,
  ) { }

  async create(creerConcoursExamenDto: CreerConcoursExamenDto) {
    this.logger.log(`Création d'un concours/examen: ${creerConcoursExamenDto.titre}`);
    const newConcoursExamen = this.concoursExamenRepository.create(creerConcoursExamenDto);
    const saved = await this.concoursExamenRepository.save(newConcoursExamen);
    this.logger.log(`Concours/Examen créé: ${saved.titre} (ID: ${saved.id})`);
    return saved;
  }

  async findAll() {
    this.logger.log('Récupération de tous les concours/examens');
    const concoursExamens = await this.concoursExamenRepository.find({
      order: { date: 'ASC', date_creation: 'DESC' },
    });
    this.logger.log(`${concoursExamens.length} concours/examen(s) trouvé(s)`);
    return concoursExamens;
  }

  async findOne(id: number) {
    this.logger.log(`Recherche du concours/examen ID: ${id}`);
    const concoursExamen = await this.concoursExamenRepository.findOne({
      where: { id },
    });

    if (!concoursExamen) {
      this.logger.warn(`Concours/Examen ID ${id} introuvable`);
      throw new NotFoundException('Concours/Examen non trouvé');
    }

    this.logger.log(`Concours/Examen trouvé: ${concoursExamen.titre} (ID: ${id})`);
    return concoursExamen;
  }

  async update(id: number, updateConcoursExamenDto: UpdateConcoursExamenDto) {
    this.logger.log(`Mise à jour du concours/examen ID: ${id}`);
    const concoursExamen = await this.concoursExamenRepository.findOne({
      where: { id },
    });

    if (!concoursExamen) {
      this.logger.warn(`Mise à jour échouée: concours/examen ID ${id} introuvable`);
      throw new NotFoundException('Concours/Examen non trouvé');
    }

    Object.assign(concoursExamen, updateConcoursExamenDto);
    const updated = await this.concoursExamenRepository.save(concoursExamen);
    this.logger.log(`Concours/Examen mis à jour: ${updated.titre} (ID: ${id})`);
    return updated;
  }

  async remove(id: number) {
    this.logger.log(`Suppression du concours/examen ID: ${id}`);
    const concoursExamen = await this.concoursExamenRepository.findOne({
      where: { id },
    });

    if (!concoursExamen) {
      this.logger.warn(`Suppression échouée: concours/examen ID ${id} introuvable`);
      throw new NotFoundException('Concours/Examen non trouvé');
    }

    await this.concoursExamenRepository.remove(concoursExamen);
    this.logger.log(`Concours/Examen supprimé: ${concoursExamen.titre} (ID: ${id})`);
    return { message: 'Concours/Examen supprimé avec succès' };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Etablissement } from './entities/etablissement.entity';
import { CreerEtablissementDto } from './dto/creer-etablissement.dto';
import { MajEtablissementDto } from './dto/maj-etablissement.dto';

@Injectable()
export class EtablissementsService {
  constructor(
    @InjectRepository(Etablissement)
    private readonly etablissementsRepository: Repository<Etablissement>,
  ) {}

  async create(creerEtablissementDto: CreerEtablissementDto) {
    const newEtablissement = this.etablissementsRepository.create(creerEtablissementDto);
    return await this.etablissementsRepository.save(newEtablissement);
  }

  async findAll() {
    return await this.etablissementsRepository.find({
      relations: ['filieres'],
    });
  }

  async findOne(id: string) {
    const etablissement = await this.etablissementsRepository.findOne({
      where: { id: parseInt(id) },
      relations: ['filieres'],
    });

    if (!etablissement) {
      throw new NotFoundException('Établissement non trouvé');
    }

    return etablissement;
  }

  async update(id: string, majEtablissementDto: MajEtablissementDto) {
    const etablissement = await this.etablissementsRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!etablissement) {
      throw new NotFoundException('Établissement non trouvé');
    }

    Object.assign(etablissement, majEtablissementDto);
    return await this.etablissementsRepository.save(etablissement);
  }

  async remove(id: string) {
    const etablissement = await this.etablissementsRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!etablissement) {
      throw new NotFoundException('Établissement non trouvé');
    }

    await this.etablissementsRepository.remove(etablissement);
    return { message: 'Établissement supprimé avec succès' };
  }
}
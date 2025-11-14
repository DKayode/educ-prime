import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NiveauEtude } from './entities/niveau-etude.entity';
import { CreerNiveauEtudeDto } from './dto/creer-niveau-etude.dto';
import { MajNiveauEtudeDto } from './dto/maj-niveau-etude.dto';

@Injectable()
export class NiveauEtudeService {
  constructor(
    @InjectRepository(NiveauEtude)
    private readonly niveauEtudeRepository: Repository<NiveauEtude>,
  ) {}

  async create(creerNiveauEtudeDto: CreerNiveauEtudeDto) {
    const newNiveauEtude = new NiveauEtude();
    newNiveauEtude.nom = creerNiveauEtudeDto.nom;
    newNiveauEtude.duree_mois = creerNiveauEtudeDto.duree_mois;
    newNiveauEtude.filiere_id = creerNiveauEtudeDto.filiere_id;
    return await this.niveauEtudeRepository.save(newNiveauEtude);
  }

  async findAll() {
    return await this.niveauEtudeRepository.find({
      relations: ['filiere', 'matieres'],
    });
  }

  async findOne(id: string) {
    const niveauEtude = await this.niveauEtudeRepository.findOne({
      where: { id: parseInt(id) },
      relations: ['filiere', 'matieres'],
    });

    if (!niveauEtude) {
      throw new NotFoundException('Niveau d\'étude non trouvé');
    }

    return niveauEtude;
  }

  async update(id: string, majNiveauEtudeDto: MajNiveauEtudeDto) {
    const niveauEtude = await this.niveauEtudeRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!niveauEtude) {
      throw new NotFoundException('Niveau d\'étude non trouvé');
    }

    Object.assign(niveauEtude, majNiveauEtudeDto);
    return await this.niveauEtudeRepository.save(niveauEtude);
  }

  async remove(id: string) {
    const niveauEtude = await this.niveauEtudeRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!niveauEtude) {
      throw new NotFoundException('Niveau d\'étude non trouvé');
    }

    await this.niveauEtudeRepository.remove(niveauEtude);
    return { message: 'Niveau d\'étude supprimé avec succès' };
  }

  async findByFiliere(filiereId: string) {
    return await this.niveauEtudeRepository.find({
      where: { filiere: { id: parseInt(filiereId) } },
      relations: ['matieres'],
    });
  }
}
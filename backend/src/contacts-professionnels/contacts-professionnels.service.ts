import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactsProfessionnel } from './entities/contacts-professionnel.entity';
import { CreerContactsProfessionnelDto } from './dto/create-contacts-professionnel.dto';
import { UpdateContactsProfessionnelDto } from './dto/update-contacts-professionnel.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginationResponse } from '../common/interfaces/pagination-response.interface';

@Injectable()
export class ContactsProfessionnelsService {
  private readonly logger = new Logger(ContactsProfessionnelsService.name);

  constructor(
    @InjectRepository(ContactsProfessionnel)
    private readonly contactsProfessionnelRepository: Repository<ContactsProfessionnel>,
  ) { }

  async create(creerContactsProfessionnelDto: CreerContactsProfessionnelDto) {
    this.logger.log(`Création d'un contact professionnel: ${creerContactsProfessionnelDto.nom}`);
    const newContact = this.contactsProfessionnelRepository.create(creerContactsProfessionnelDto);
    const saved = await this.contactsProfessionnelRepository.save(newContact);
    this.logger.log(`Contact professionnel créé: ${saved.nom} (ID: ${saved.id})`);
    return saved;
  }

  async findAll(paginationDto: PaginationDto): Promise<PaginationResponse<ContactsProfessionnel>> {
    const { page = 1, limit = 10 } = paginationDto;
    this.logger.log(`Récupération des contacts professionnels - Page: ${page}, Limite: ${limit}`);

    const [contacts, total] = await this.contactsProfessionnelRepository.findAndCount({
      order: { date_creation: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    this.logger.log(`${contacts.length} contact(s) professionnel(s) trouvé(s) sur ${total} total`);

    return {
      data: contacts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number) {
    this.logger.log(`Recherche du contact professionnel ID: ${id}`);
    const contact = await this.contactsProfessionnelRepository.findOne({
      where: { id },
    });

    if (!contact) {
      this.logger.warn(`Contact professionnel ID ${id} introuvable`);
      throw new NotFoundException('Contact professionnel non trouvé');
    }

    this.logger.log(`Contact professionnel trouvé: ${contact.nom} (ID: ${id})`);
    return contact;
  }

  async update(id: number, updateContactsProfessionnelDto: UpdateContactsProfessionnelDto) {
    this.logger.log(`Mise à jour du contact professionnel ID: ${id}`);
    const contact = await this.contactsProfessionnelRepository.findOne({
      where: { id },
    });

    if (!contact) {
      this.logger.warn(`Mise à jour échouée: contact professionnel ID ${id} introuvable`);
      throw new NotFoundException('Contact professionnel non trouvé');
    }

    Object.assign(contact, updateContactsProfessionnelDto);
    const updated = await this.contactsProfessionnelRepository.save(contact);
    this.logger.log(`Contact professionnel mis à jour: ${updated.nom} (ID: ${id})`);
    return updated;
  }

  async remove(id: number) {
    this.logger.log(`Suppression du contact professionnel ID: ${id}`);
    const contact = await this.contactsProfessionnelRepository.findOne({
      where: { id },
    });

    if (!contact) {
      this.logger.warn(`Suppression échouée: contact professionnel ID ${id} introuvable`);
      throw new NotFoundException('Contact professionnel non trouvé');
    }

    await this.contactsProfessionnelRepository.remove(contact);
    this.logger.log(`Contact professionnel supprimé: ${contact.nom} (ID: ${id})`);
    return { message: 'Contact professionnel supprimé avec succès' };
  }
}

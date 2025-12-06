import { PartialType } from '@nestjs/mapped-types';
import { CreerContactsProfessionnelDto } from './create-contacts-professionnel.dto';

export class UpdateContactsProfessionnelDto extends PartialType(CreerContactsProfessionnelDto) { }

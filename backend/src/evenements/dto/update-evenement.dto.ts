import { PartialType } from '@nestjs/mapped-types';
import { CreerEvenementDto } from './create-evenement.dto';

export class UpdateEvenementDto extends PartialType(CreerEvenementDto) { }

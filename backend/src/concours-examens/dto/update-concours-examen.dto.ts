import { PartialType } from '@nestjs/mapped-types';
import { CreerConcoursExamenDto } from './create-concours-examen.dto';

export class UpdateConcoursExamenDto extends PartialType(CreerConcoursExamenDto) { }

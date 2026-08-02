import { PartialType } from '@nestjs/swagger';
import { CreateMatiereFiliereExamenDto } from './create-matiere-filiere-examen.dto';

export class UpdateMatiereFiliereExamenDto extends PartialType(CreateMatiereFiliereExamenDto) {}

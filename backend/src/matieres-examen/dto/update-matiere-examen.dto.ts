import { PartialType } from '@nestjs/swagger';
import { CreateMatiereExamenDto } from './create-matiere-examen.dto';

export class UpdateMatiereExamenDto extends PartialType(CreateMatiereExamenDto) {}

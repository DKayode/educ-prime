import { PartialType } from '@nestjs/swagger';
import { CreateFiliereExamenDto } from './create-filiere-examen.dto';

export class UpdateFiliereExamenDto extends PartialType(CreateFiliereExamenDto) {}

import { PartialType } from '@nestjs/swagger';
import { CreateTypeExamenDto } from './create-type-examen.dto';

export class UpdateTypeExamenDto extends PartialType(CreateTypeExamenDto) {}

import { PartialType } from '@nestjs/swagger';
import { CreateTitreDto } from './create-titre.dto';

export class UpdateTitreDto extends PartialType(CreateTitreDto) {}

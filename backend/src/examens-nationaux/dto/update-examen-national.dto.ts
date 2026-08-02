import { PartialType } from '@nestjs/swagger';
import { CreateExamenNationalDto } from './create-examen-national.dto';

export class UpdateExamenNationalDto extends PartialType(CreateExamenNationalDto) { }

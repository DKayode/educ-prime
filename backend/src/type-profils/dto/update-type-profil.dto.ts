import { PartialType } from '@nestjs/swagger';
import { CreateTypeProfilDto } from './create-type-profil.dto';

export class UpdateTypeProfilDto extends PartialType(CreateTypeProfilDto) {}

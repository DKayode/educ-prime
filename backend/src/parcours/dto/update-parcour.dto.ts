import { PartialType } from '@nestjs/mapped-types';
// import { PartialType } from '@nestjs/swagger';
import { CreateParcourDto } from './create-parcour.dto';

export class UpdateParcourDto extends PartialType(CreateParcourDto) { }
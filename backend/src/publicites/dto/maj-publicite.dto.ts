import { PartialType } from '@nestjs/mapped-types';
import { CreerPubliciteDto } from './creer-publicite.dto';

export class MajPubliciteDto extends PartialType(CreerPubliciteDto) { }

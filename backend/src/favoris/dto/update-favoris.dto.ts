import { PartialType } from '@nestjs/mapped-types';
import { CreateFavoriDto } from './create-favoris.dto';
// import { PartialType } from '@nestjs/swagger';


export class UpdateFavorisDto extends PartialType(CreateFavoriDto) { }

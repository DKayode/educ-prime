import { PartialType } from '@nestjs/mapped-types';
// import { PartialType } from '@nestjs/swagger';
import { CreateLikeDto } from './create-like.dto';

export class UpdateLikeDto extends PartialType(CreateLikeDto) { }

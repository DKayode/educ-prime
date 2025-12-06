import { PartialType } from '@nestjs/mapped-types';
import { CreerOpportuniteDto } from './create-opportunite.dto';

export class UpdateOpportuniteDto extends PartialType(CreerOpportuniteDto) { }


import { PartialType, PickType } from '@nestjs/swagger';
import { CreateForumDto } from './create-forum.dto';

export class UpdateForumDto extends PartialType(PickType(CreateForumDto, ['theme', 'content'] as const)) { }

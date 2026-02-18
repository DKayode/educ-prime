
import { PartialType, PickType } from '@nestjs/swagger';
import { CreateCommentPolymorphicDto } from './create-comment-polymorphic.dto';

export class UpdateCommentPolymorphicDto extends PartialType(PickType(CreateCommentPolymorphicDto, ['content'] as const)) { }

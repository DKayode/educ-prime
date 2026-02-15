import { ApiProperty } from '@nestjs/swagger';
import { utilisateurs } from '@prisma/client';

export class ForumEntity {
    @ApiProperty({ description: 'The unique identifier of the forum', example: 1 })
    id: number;

    @ApiProperty({ description: 'The theme or title of the forum discussion', example: 'Mathematics Discussion' })
    theme: string;

    @ApiProperty({ description: 'The main content or body of the forum post', example: 'How do I solve quadratic equations?' })
    content: string;

    @ApiProperty({ required: false, description: 'URL of the optional photo attached to the forum', example: 'https://storage.googleapis.com/.../image.jpg' })
    photo: string;

    @ApiProperty({ description: 'Flag indicating if the user is anonymous' })
    is_anonym: boolean;

    @ApiProperty({ description: 'ID of the user who created the forum' })
    user_id: number;

    @ApiProperty({ description: 'Date when the forum was created' })
    created_at: Date;

    @ApiProperty({ description: 'Date when the forum was last updated' })
    updated_at: Date;

    @ApiProperty({ description: 'Total number of likes' })
    nb_like: number;

    @ApiProperty({ description: 'Flag indicating if the current user liked this forum' })
    is_like: boolean;

    @ApiProperty({ description: 'Total number of comments' })
    nb_comment: number;

    @ApiProperty({ required: false, description: 'User details (safe fields only)' })
    user?: any;
}

import { ApiProperty } from '@nestjs/swagger';

export class CheckVersionResponseDto {
    @ApiProperty({ example: '1.0.0' })
    current_version: string;

    @ApiProperty({ example: '1.1.0' })
    latest_version: string;

    @ApiProperty({ enum: ['required', 'optional', 'up_to_date'] })
    update_type: 'required' | 'optional' | 'up_to_date';

    @ApiProperty()
    update_url: string;

    @ApiProperty({ example: { fr: 'Notes', en: 'Notes' } })
    release_notes: { fr?: string; en?: string };
}

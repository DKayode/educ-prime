import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, Min } from 'class-validator';
import { TypeRessourceQuota } from '../entities/quota-consommation.entity';

export class ConsommerKetsiaDto {
  @ApiProperty({ enum: ['epreuve', 'examen_national'], example: 'epreuve' })
  @IsIn(['epreuve', 'examen_national'], { message: 'resource_type doit valoir epreuve ou examen_national' })
  resource_type: TypeRessourceQuota;

  @ApiProperty({ example: 42, description: 'Identifiant de la ressource sur laquelle Ketsia est lancée' })
  @IsInt({ message: 'resource_id doit être un entier' })
  @Min(1)
  @IsNotEmpty()
  resource_id: number;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { FormResponse } from './form-response.entity';
import { FormQuestion } from './form-question.entity';

@Entity('form_answers')
export class FormAnswer {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  response_id: string;

  @Column('uuid')
  question_id: string;

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: 'smallint', nullable: true })
  rating: number | null;

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: 'text', nullable: true })
  texte: string | null;

  @ManyToOne(() => FormResponse, (response) => response.answers, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'response_id' })
  response: FormResponse;

  @ManyToOne(() => FormQuestion, (question) => question.answers, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'question_id' })
  question: FormQuestion;
}

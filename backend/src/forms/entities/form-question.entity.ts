import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { FormSection } from './form-section.entity';
import { FormAnswer } from './form-answer.entity';

export type QuestionType = 'rating' | 'text';

@Entity('form_questions')
export class FormQuestion {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  section_id: string;

  @ApiProperty()
  @Column()
  libelle: string;

  @ApiProperty({ enum: ['rating', 'text'] })
  @Column({ type: 'varchar', length: 20 })
  type: QuestionType;

  @ApiProperty()
  @Column({ type: 'int', default: 0 })
  ordre: number;

  @ManyToOne(() => FormSection, (section) => section.questions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'section_id' })
  section: FormSection;

  @OneToMany(() => FormAnswer, (answer) => answer.question)
  answers: FormAnswer[];
}

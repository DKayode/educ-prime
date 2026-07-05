import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormsController } from './forms.controller';
import { FormsUserController } from './forms-user.controller';
import { FormsService } from './forms.service';
import { FormCampaign } from './entities/form-campaign.entity';
import { FormSection } from './entities/form-section.entity';
import { FormQuestion } from './entities/form-question.entity';
import { FormResponse } from './entities/form-response.entity';
import { FormAnswer } from './entities/form-answer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FormCampaign,
      FormSection,
      FormQuestion,
      FormResponse,
      FormAnswer,
    ]),
  ],
  // FormsUserController first: its literal `/forms/active` route must be
  // registered before the admin `/forms/:uuid` param route.
  controllers: [FormsUserController, FormsController],
  providers: [FormsService],
  exports: [FormsService],
})
export class FormsModule {}

import { Test, TestingModule } from '@nestjs/testing';
import { PrestatairesController } from './prestataires.controller';

describe('PrestatairesController', () => {
  let controller: PrestatairesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrestatairesController],
    }).compile();

    controller = module.get<PrestatairesController>(PrestatairesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

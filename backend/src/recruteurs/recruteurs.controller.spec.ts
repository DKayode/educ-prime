import { Test, TestingModule } from '@nestjs/testing';
import { RecruteursController } from './recruteurs.controller';

describe('RecruteursController', () => {
  let controller: RecruteursController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecruteursController],
    }).compile();

    controller = module.get<RecruteursController>(RecruteursController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

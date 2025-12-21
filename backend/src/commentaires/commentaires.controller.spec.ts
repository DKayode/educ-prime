import { Test, TestingModule } from '@nestjs/testing';
import { CommentairesController } from './commentaires.controller';
import { CommentairesService } from './commentaires.service';

describe('CommentairesController', () => {
  let controller: CommentairesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentairesController],
      providers: [CommentairesService],
    }).compile();

    controller = module.get<CommentairesController>(CommentairesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

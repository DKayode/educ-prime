import { Test, TestingModule } from '@nestjs/testing';
import { RecruteursService } from './recruteurs.service';

describe('RecruteursService', () => {
  let service: RecruteursService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RecruteursService],
    }).compile();

    service = module.get<RecruteursService>(RecruteursService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

import { Injectable } from '@nestjs/common';
import { CreateWalletForUserUseCase } from './create-wallet-for-user.use-case';

@Injectable()
export class GetMyWalletUseCase {
  constructor(private readonly createWalletForUser: CreateWalletForUserUseCase) {}

  async execute(userId: number) {
    return this.createWalletForUser.execute(userId);
  }
}

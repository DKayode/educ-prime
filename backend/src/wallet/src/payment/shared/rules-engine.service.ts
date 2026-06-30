import { Injectable } from '@nestjs/common';

export interface RuleResult {
  passed: boolean;
  code?: string;
  message?: string;
}

export interface BusinessRule<TContext> {
  readonly name: string;
  evaluate(context: TContext): Promise<RuleResult> | RuleResult;
}

@Injectable()
export class RuleEngineService {
  async evaluate<TContext>(rules: BusinessRule<TContext>[], context: TContext) {
    const failures: RuleResult[] = [];

    for (const rule of rules) {
      const result = await rule.evaluate(context);
      if (!result.passed) {
        failures.push({ ...result, code: result.code ?? rule.name });
      }
    }

    return { passed: failures.length === 0, failures };
  }
}

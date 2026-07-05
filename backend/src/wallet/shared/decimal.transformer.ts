import { ValueTransformer } from 'typeorm';

export const DecimalColumnTransformer: ValueTransformer = {
  to: (value?: number | string | null): number | string | null => value ?? 0,
  from: (value?: string | number | null): number => Number(value ?? 0),
};

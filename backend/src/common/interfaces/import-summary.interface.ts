export interface ImportError {
  line: number;
  reason: string;
}

export interface ImportSummary {
  created: number;
  skipped: number;
  errors: ImportError[];
}

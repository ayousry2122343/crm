export interface FilterDef {
  key: string;
  labelAr: string;
  labelEn: string;
  type: 'string' | 'date' | 'number' | 'select';
  options?: { value: string; labelAr: string; labelEn: string }[];
}

export interface ReportResult {
  rows: Record<string, unknown>[];
  summary: Record<string, unknown>;
}

export interface IStandardReport {
  id: string;
  labelAr: string;
  labelEn: string;
  acceptedFilters: FilterDef[];
  run(workspaceId: string, filters: Record<string, unknown>): Promise<ReportResult>;
}

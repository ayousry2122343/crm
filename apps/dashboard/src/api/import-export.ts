import { api as http } from './client';

export interface PreviewResult {
  headers: string[];
  rows: Record<string, string>[];
}

export interface ImportResult {
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: Array<{ row: number; message: string }>;
}

export const importExportApi = {
  preview: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return http
      .post<PreviewResult>('/import-export/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  importPeople: (
    rows: Record<string, string>[],
    mapping: Record<string, string>,
    fileName: string,
  ) =>
    http
      .post<ImportResult>('/import-export/import/people', { rows, mapping, fileName })
      .then((r) => r.data),

  exportPeople: (params?: { format?: string; search?: string; lifecycleStage?: string; isCompany?: string }) =>
    http
      .get('/import-export/export/people', { params, responseType: 'blob' })
      .then((r) => {
        const disposition = r.headers['content-disposition'] ?? '';
        const match = disposition.match(/filename="?(.+?)"?$/);
        const filename = match?.[1] ?? 'people-export.csv';
        downloadBlob(r.data, filename);
      }),

  exportDeals: (params?: { format?: string; search?: string; status?: string }) =>
    http
      .get('/import-export/export/deals', { params, responseType: 'blob' })
      .then((r) => {
        const disposition = r.headers['content-disposition'] ?? '';
        const match = disposition.match(/filename="?(.+?)"?$/);
        const filename = match?.[1] ?? 'deals-export.csv';
        downloadBlob(r.data, filename);
      }),
};

function downloadBlob(data: Blob, filename: string) {
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

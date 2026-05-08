import { Test, TestingModule } from '@nestjs/testing';
import { ImportExportController } from './import-export.controller';
import { ImportExportService } from './import-export.service';
import { PermissionGuard } from '../../core/rbac/permission.guard';

const mockService = {
  parsePreview: jest.fn(),
  importPeople: jest.fn(),
  exportPeople: jest.fn(),
  exportDeals: jest.fn(),
};

function mockResponse() {
  const res: any = {
    set: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  return res;
}

describe('ImportExportController', () => {
  let ctrl: ImportExportController;

  beforeEach(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      controllers: [ImportExportController],
      providers: [{ provide: ImportExportService, useValue: mockService }],
    })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(ImportExportController);
    jest.clearAllMocks();
  });

  it('preview delegates to service.parsePreview', () => {
    const file = { buffer: Buffer.from('csv'), mimetype: 'text/csv' } as any;
    ctrl.preview(file);
    expect(mockService.parsePreview).toHaveBeenCalledWith(file.buffer, 'text/csv');
  });

  it('importPeople delegates to service.importPeople', () => {
    const body = {
      rows: [{ name: 'Ahmed' }],
      mapping: { name: 'fullName' },
      fileName: 'contacts.csv',
    };
    ctrl.importPeople(body);
    expect(mockService.importPeople).toHaveBeenCalledWith(body.rows, body.mapping, body.fileName);
  });

  it('exportPeople sends CSV response', async () => {
    const result = {
      mimeType: 'text/csv',
      filename: 'people.csv',
      buffer: Buffer.from('data'),
    };
    mockService.exportPeople.mockResolvedValue(result);
    const res = mockResponse();
    await ctrl.exportPeople({ format: 'csv' }, res);
    expect(mockService.exportPeople).toHaveBeenCalledWith(
      { search: undefined, lifecycleStage: undefined, isCompany: undefined },
      'csv',
    );
    expect(res.set).toHaveBeenCalledWith({
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="people.csv"',
    });
    expect(res.send).toHaveBeenCalledWith(result.buffer);
  });

  it('exportPeople passes excel format', async () => {
    mockService.exportPeople.mockResolvedValue({
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: 'people.xlsx',
      buffer: Buffer.from('xl'),
    });
    const res = mockResponse();
    await ctrl.exportPeople({ format: 'excel' }, res);
    expect(mockService.exportPeople).toHaveBeenCalledWith(expect.anything(), 'excel');
  });

  it('exportPeople parses isCompany query param correctly', async () => {
    mockService.exportPeople.mockResolvedValue({
      mimeType: 'text/csv',
      filename: 'c.csv',
      buffer: Buffer.from(''),
    });
    const res = mockResponse();
    await ctrl.exportPeople({ isCompany: 'true' }, res);
    expect(mockService.exportPeople).toHaveBeenCalledWith(
      expect.objectContaining({ isCompany: true }),
      'csv',
    );
  });

  it('exportDeals sends response with headers', async () => {
    const result = {
      mimeType: 'text/csv',
      filename: 'deals.csv',
      buffer: Buffer.from('deal-data'),
    };
    mockService.exportDeals.mockResolvedValue(result);
    const res = mockResponse();
    await ctrl.exportDeals({ format: 'csv', search: 'acme', status: 'WON' }, res);
    expect(mockService.exportDeals).toHaveBeenCalledWith(
      { search: 'acme', status: 'WON' },
      'csv',
    );
    expect(res.set).toHaveBeenCalled();
    expect(res.send).toHaveBeenCalledWith(result.buffer);
  });
});

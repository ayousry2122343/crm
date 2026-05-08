import { Test, TestingModule } from '@nestjs/testing';
import { PersonController } from './person.controller';
import { PersonService } from './person.service';
import { PermissionGuard } from '../../core/rbac/permission.guard';

const mockService = {
  list: jest.fn(),
  findDuplicates: jest.fn(),
  merge: jest.fn(),
  get: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  archive: jest.fn(),
};

describe('PersonController', () => {
  let ctrl: PersonController;

  beforeEach(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      controllers: [PersonController],
      providers: [{ provide: PersonService, useValue: mockService }],
    })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(PersonController);
    jest.clearAllMocks();
  });

  it('list delegates to service.list', () => {
    const q = { limit: 20 } as any;
    ctrl.list(q);
    expect(mockService.list).toHaveBeenCalledWith(q);
  });

  it('duplicates delegates to service.findDuplicates', () => {
    ctrl.duplicates('test@test.com', '+201234567890');
    expect(mockService.findDuplicates).toHaveBeenCalledWith('test@test.com', '+201234567890');
  });

  it('duplicates works with no params', () => {
    ctrl.duplicates();
    expect(mockService.findDuplicates).toHaveBeenCalledWith(undefined, undefined);
  });

  it('merge delegates to service.merge', () => {
    const dto = { primaryId: 'p_1', secondaryId: 'p_2' } as any;
    ctrl.merge(dto);
    expect(mockService.merge).toHaveBeenCalledWith(dto);
  });

  it('get delegates to service.get', () => {
    ctrl.get('p_1');
    expect(mockService.get).toHaveBeenCalledWith('p_1');
  });

  it('create delegates to service.create', () => {
    const dto = { firstName: 'Ahmed' } as any;
    ctrl.create(dto);
    expect(mockService.create).toHaveBeenCalledWith(dto);
  });

  it('update delegates to service.update', () => {
    const dto = { firstName: 'Sara' } as any;
    ctrl.update('p_1', dto);
    expect(mockService.update).toHaveBeenCalledWith('p_1', dto);
  });

  it('archive delegates to service.archive', () => {
    ctrl.archive('p_1');
    expect(mockService.archive).toHaveBeenCalledWith('p_1');
  });
});

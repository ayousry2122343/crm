import { TicketController } from './ticket.controller';

function makeSvc() {
  return {
    list: jest.fn().mockResolvedValue({ items: [], nextCursor: null }),
    get: jest.fn().mockResolvedValue({ id: 't_1' }),
    create: jest.fn().mockResolvedValue({ id: 't_1' }),
    update: jest.fn().mockResolvedValue({ id: 't_1' }),
    changeStatus: jest.fn().mockResolvedValue({ id: 't_1', status: 'OPEN' }),
    assign: jest.fn().mockResolvedValue({ id: 't_1', assigneeId: 'u_1' }),
    archive: jest.fn().mockResolvedValue({ id: 't_1' }),
  };
}

describe('TicketController', () => {
  it('list() delegates to svc.list', async () => {
    const svc = makeSvc();
    const ctrl = new TicketController(svc as any);
    const q = { limit: 10 };
    await ctrl.list(q as any);
    expect(svc.list).toHaveBeenCalledWith(q);
  });

  it('get() delegates to svc.get', async () => {
    const svc = makeSvc();
    const ctrl = new TicketController(svc as any);
    await ctrl.get('t_1');
    expect(svc.get).toHaveBeenCalledWith('t_1');
  });

  it('create() delegates to svc.create', async () => {
    const svc = makeSvc();
    const ctrl = new TicketController(svc as any);
    const dto = { subject: 'Bug' };
    await ctrl.create(dto as any);
    expect(svc.create).toHaveBeenCalledWith(dto);
  });

  it('update() delegates to svc.update', async () => {
    const svc = makeSvc();
    const ctrl = new TicketController(svc as any);
    const dto = { subject: 'Updated' };
    await ctrl.update('t_1', dto as any);
    expect(svc.update).toHaveBeenCalledWith('t_1', dto);
  });

  it('changeStatus() delegates to svc.changeStatus with dto.status', async () => {
    const svc = makeSvc();
    const ctrl = new TicketController(svc as any);
    const dto = { status: 'OPEN' };
    await ctrl.changeStatus('t_1', dto as any);
    expect(svc.changeStatus).toHaveBeenCalledWith('t_1', 'OPEN');
  });

  it('assign() delegates to svc.assign with dto.assigneeId', async () => {
    const svc = makeSvc();
    const ctrl = new TicketController(svc as any);
    const dto = { assigneeId: 'u_2' };
    await ctrl.assign('t_1', dto as any);
    expect(svc.assign).toHaveBeenCalledWith('t_1', 'u_2');
  });

  it('archive() delegates to svc.archive', async () => {
    const svc = makeSvc();
    const ctrl = new TicketController(svc as any);
    await ctrl.archive('t_1');
    expect(svc.archive).toHaveBeenCalledWith('t_1');
  });
});

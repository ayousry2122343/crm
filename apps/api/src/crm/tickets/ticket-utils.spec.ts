import { formatTicketNumber, VALID_TRANSITIONS } from './ticket.service';

describe('formatTicketNumber', () => {
  it('formats 1 as TKT-0001', () => {
    expect(formatTicketNumber(1)).toBe('TKT-0001');
  });

  it('formats 42 as TKT-0042', () => {
    expect(formatTicketNumber(42)).toBe('TKT-0042');
  });

  it('formats 9999 as TKT-9999', () => {
    expect(formatTicketNumber(9999)).toBe('TKT-9999');
  });

  it('formats 10000 as TKT-10000 (overflow beyond 4 digits)', () => {
    expect(formatTicketNumber(10000)).toBe('TKT-10000');
  });

  it('formats 0 as TKT-0000', () => {
    expect(formatTicketNumber(0)).toBe('TKT-0000');
  });
});

describe('VALID_TRANSITIONS', () => {
  it('NEW can transition to OPEN, PENDING, RESOLVED, CLOSED', () => {
    expect(VALID_TRANSITIONS['NEW']).toEqual(
      expect.arrayContaining(['OPEN', 'PENDING', 'RESOLVED', 'CLOSED']),
    );
  });

  it('CLOSED can only reopen to OPEN', () => {
    expect(VALID_TRANSITIONS['CLOSED']).toEqual(['OPEN']);
  });

  it('RESOLVED can go to OPEN or CLOSED', () => {
    expect(VALID_TRANSITIONS['RESOLVED']).toEqual(
      expect.arrayContaining(['OPEN', 'CLOSED']),
    );
  });

  it('NEW cannot go to ON_HOLD', () => {
    expect(VALID_TRANSITIONS['NEW']).not.toContain('ON_HOLD');
  });
});

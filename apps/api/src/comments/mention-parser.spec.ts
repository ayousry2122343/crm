import { parseMentions } from './mention-parser';

describe('parseMentions', () => {
  it('extracts single mention from body', () => {
    const result = parseMentions('Hello @[Ahmed Yousry](u_1), please review');
    expect(result).toEqual(['u_1']);
  });

  it('extracts multiple mentions', () => {
    const result = parseMentions(
      'Hey @[Ahmed](u_1) and @[Sara](u_2), take a look',
    );
    expect(result).toEqual(['u_1', 'u_2']);
  });

  it('returns empty array when no mentions', () => {
    const result = parseMentions('No mentions here');
    expect(result).toEqual([]);
  });

  it('deduplicates repeated mentions', () => {
    const result = parseMentions('@[Ahmed](u_1) and @[Ahmed](u_1) again');
    expect(result).toEqual(['u_1']);
  });

  it('handles empty string', () => {
    expect(parseMentions('')).toEqual([]);
  });

  it('handles mentions at start and end of body', () => {
    const result = parseMentions('@[Start](u_1) middle @[End](u_2)');
    expect(result).toEqual(['u_1', 'u_2']);
  });

  it('ignores malformed mentions', () => {
    const result = parseMentions('@[Name] and @(id) and @[Name](u_1)');
    expect(result).toEqual(['u_1']);
  });
});

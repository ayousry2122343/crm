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

  it('handles Arabic text with mentions mixed in', () => {
    const result = parseMentions('مرحبا @[أحمد يوسري](u_1) كيف حالك @[سارة](u_2)');
    expect(result).toEqual(['u_1', 'u_2']);
  });

  it('handles mentions with special characters in name', () => {
    const result = parseMentions('@[O\'Brien-Smith](u_1) and @[José García](u_2)');
    expect(result).toEqual(['u_1', 'u_2']);
  });

  it('handles mention embedded in longer text without spaces', () => {
    const result = parseMentions('cc:@[Admin](u_admin),@[Support](u_support)');
    expect(result).toEqual(['u_admin', 'u_support']);
  });

  it('returns empty for null-like inputs when cast to string', () => {
    expect(parseMentions('undefined')).toEqual([]);
    expect(parseMentions('null')).toEqual([]);
  });

  it('handles very long body with mentions scattered throughout', () => {
    const longText = 'A'.repeat(1000) + ' @[User](u_1) ' + 'B'.repeat(1000) + ' @[User2](u_2) ' + 'C'.repeat(1000);
    const result = parseMentions(longText);
    expect(result).toEqual(['u_1', 'u_2']);
  });
});

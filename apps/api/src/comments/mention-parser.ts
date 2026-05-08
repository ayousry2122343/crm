const MENTION_RE = /@\[[^\]]+\]\(([^)]+)\)/g;

export function parseMentions(body: string): string[] {
  const ids = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = MENTION_RE.exec(body)) !== null) {
    ids.add(match[1]);
  }
  return [...ids];
}

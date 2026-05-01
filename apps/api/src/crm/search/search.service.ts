import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

export interface SearchHit {
  id: string;
  entityType: string;
  title: string;
  subtitle: string | null;
  rank: number;
}

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
  ) {}

  private requireWs(): string {
    const ws = this.tenant.getStore()?.workspaceId;
    if (!ws) throw new BadRequestException('no tenant context');
    return ws;
  }

  async search(q: string, types?: string[], limit = 10): Promise<{ items: SearchHit[] }> {
    const workspaceId = this.requireWs();
    const trimmed = q.trim();
    if (trimmed.length === 0) return { items: [] };

    const cap = Math.min(Math.max(limit, 1), 50);
    const includePeople = !types || types.length === 0 || types.includes('Person');
    const items: SearchHit[] = [];

    // Build a prefix tsquery: "ahmed sara" → "ahmed:* & sara:*". This gives
    // type-ahead behavior over the tsvector and keeps email/phone tokens
    // matchable since the simple dictionary doesn't split on dots/@.
    const tsquery = this.toPrefixTsQuery(trimmed);
    if (!tsquery) return { items: [] };

    if (includePeople) {
      const rows = await this.prisma.$queryRaw<
        Array<{
          id: string;
          entityType: string;
          title: string;
          subtitle: string | null;
          rank: number;
        }>
      >`
        SELECT
          id,
          'Person' AS "entityType",
          "fullName" AS title,
          email AS subtitle,
          ts_rank("search_tsv", to_tsquery('simple', ${tsquery})) AS rank
        FROM "Person"
        WHERE "workspaceId" = ${workspaceId}
          AND "archivedAt" IS NULL
          AND "search_tsv" @@ to_tsquery('simple', ${tsquery})
        ORDER BY rank DESC
        LIMIT ${cap}
      `;
      items.push(...rows);
    }

    return { items };
  }

  /**
   * Converts a free-form query into a tsquery string with prefix matching for
   * each token. Strips punctuation that would break to_tsquery and lowercases
   * everything. Returns null when nothing usable remains.
   */
  private toPrefixTsQuery(input: string): string | null {
    // Split on whitespace; for each chunk drop tsquery operators and quotes,
    // keep alphanumerics/dots/@ which are valid simple-dict token chars.
    const tokens = input
      .toLowerCase()
      .split(/\s+/)
      .map((t) => t.replace(/[^\p{L}\p{N}._@-]/gu, ''))
      .filter((t) => t.length > 0);
    if (tokens.length === 0) return null;
    return tokens.map((t) => `${t}:*`).join(' & ');
  }
}

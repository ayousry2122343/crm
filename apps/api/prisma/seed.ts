/**
 * Prisma seed: idempotently ensures every existing workspace has the three
 * default system profiles (Admin, Sales Manager, Sales Rep). New workspaces
 * created via `AuthService.signUp` already get these profiles automatically;
 * this seed is a recovery utility for workspaces that pre-date the RBAC
 * migration or were created outside the sign-up flow.
 *
 * Run via: `pnpm --filter @crm/api seed`
 */
import { PrismaClient } from '@prisma/client';
import {
  ALL_PERMISSIONS,
  PERMISSIONS,
} from '../src/core/rbac/permissions.constants';

const prisma = new PrismaClient();

const DEFAULT_PROFILES: { name: string; permissions: string[] }[] = [
  { name: 'Admin', permissions: [...ALL_PERMISSIONS] },
  {
    name: 'Sales Manager',
    permissions: [
      PERMISSIONS.PERSON_READ,
      PERMISSIONS.PERSON_WRITE,
      PERMISSIONS.COMPANY_READ,
      PERMISSIONS.COMPANY_WRITE,
      PERMISSIONS.DEAL_READ,
      PERMISSIONS.DEAL_WRITE,
      PERMISSIONS.DEAL_DELETE,
      PERMISSIONS.ACTIVITY_READ,
      PERMISSIONS.ACTIVITY_WRITE,
      PERMISSIONS.PIPELINE_WRITE,
      PERMISSIONS.LIST_READ,
      PERMISSIONS.LIST_WRITE,
      PERMISSIONS.TAG_WRITE,
      PERMISSIONS.REPORT_READ,
      PERMISSIONS.DASHBOARD_WRITE,
      PERMISSIONS.AI_USE,
    ],
  },
  {
    name: 'Sales Rep',
    permissions: [
      PERMISSIONS.PERSON_READ,
      PERMISSIONS.PERSON_WRITE,
      PERMISSIONS.COMPANY_READ,
      PERMISSIONS.COMPANY_WRITE,
      PERMISSIONS.DEAL_READ,
      PERMISSIONS.DEAL_WRITE,
      PERMISSIONS.ACTIVITY_READ,
      PERMISSIONS.ACTIVITY_WRITE,
      PERMISSIONS.LIST_READ,
      PERMISSIONS.REPORT_READ,
      PERMISSIONS.AI_USE,
    ],
  },
];

async function main() {
  const workspaces = await prisma.workspace.findMany();
  for (const ws of workspaces) {
    for (const def of DEFAULT_PROFILES) {
      const existing = await prisma.profile.findUnique({
        where: { workspaceId_name: { workspaceId: ws.id, name: def.name } },
      });
      if (!existing) {
        await prisma.profile.create({
          data: {
            workspaceId: ws.id,
            name: def.name,
            isSystem: true,
            permissions: def.permissions,
          },
        });
        // eslint-disable-next-line no-console
        console.log(`created profile ${def.name} for workspace ${ws.slug}`);
      }
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

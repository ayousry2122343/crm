import { SetMetadata } from '@nestjs/common';
import type { PermissionKey } from './permissions.constants';

export const PERMISSION_KEY = 'requiredPermissions';
export const RequiresPermission = (...perms: PermissionKey[]) => SetMetadata(PERMISSION_KEY, perms);

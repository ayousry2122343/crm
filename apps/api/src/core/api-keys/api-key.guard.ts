import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) return true;
    if (req.user) return true;

    const result = await this.apiKeyService.authenticate(apiKey);
    req.apiKeyContext = result;
    req.workspaceId = result.workspaceId;
    req.apiKeyScopes = result.scopes;

    return true;
  }
}

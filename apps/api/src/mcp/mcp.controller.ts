import { Body, Controller, Get, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Public } from '../core/auth/jwt.guard';
import { MCPService } from './mcp.service';

@ApiTags('mcp')
@Controller('mcp')
export class MCPController {
  constructor(
    private readonly mcpService: MCPService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get('tools')
  listTools(@Headers('x-mcp-key') apiKey: string) {
    this.validateKey(apiKey);
    return { tools: this.mcpService.listTools() };
  }

  @Public()
  @Post('execute')
  async execute(
    @Headers('x-mcp-key') apiKey: string,
    @Body() body: { tool: string; params?: Record<string, any>; workspaceId: string },
  ) {
    this.validateKey(apiKey);
    const result = await this.mcpService.executeTool(body.tool, body.params ?? {}, body.workspaceId);
    return result;
  }

  private validateKey(key: string) {
    const expected = this.config.get<string>('MCP_API_KEY');
    if (!expected || key !== expected) {
      throw new UnauthorizedException('invalid MCP API key');
    }
  }
}

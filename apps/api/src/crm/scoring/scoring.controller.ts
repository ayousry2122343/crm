import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ScoringService } from './scoring.service';
import { CreateScoringRuleDto } from './dto/create-scoring-rule.dto';
import { UpdateScoringRuleDto } from './dto/update-scoring-rule.dto';
import { QueryScoringRuleDto } from './dto/query-scoring-rule.dto';
import { PermissionGuard } from '../../core/rbac/permission.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('scoring')
@UseGuards(PermissionGuard)
@Controller()
export class ScoringController {
  constructor(private readonly svc: ScoringService) {}

  @RequiresPermission(PERMISSIONS.SCORING_RULE_READ)
  @Get('scoring-rules')
  list(@Query() q: QueryScoringRuleDto) {
    return this.svc.list(q);
  }

  @RequiresPermission(PERMISSIONS.SCORING_RULE_READ)
  @Get('scoring-rules/:id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @RequiresPermission(PERMISSIONS.SCORING_RULE_WRITE)
  @Post('scoring-rules')
  create(@Body() dto: CreateScoringRuleDto) {
    return this.svc.create(dto);
  }

  @RequiresPermission(PERMISSIONS.SCORING_RULE_WRITE)
  @Patch('scoring-rules/:id')
  update(@Param('id') id: string, @Body() dto: UpdateScoringRuleDto) {
    return this.svc.update(id, dto);
  }

  @RequiresPermission(PERMISSIONS.SCORING_RULE_DELETE)
  @Delete('scoring-rules/:id')
  archive(@Param('id') id: string) {
    return this.svc.archive(id);
  }

  @RequiresPermission(PERMISSIONS.SCORING_RULE_WRITE)
  @Post('scoring/score/:entityType/:entityId')
  score(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.svc.scoreEntity(entityType, entityId);
  }

  @RequiresPermission(PERMISSIONS.SCORING_RULE_WRITE)
  @Post('scoring/rescore/:entityType')
  bulkRescore(@Param('entityType') entityType: string) {
    return this.svc.bulkRescore(entityType);
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { evaluateConditions, type ConditionTree } from '../workflow/condition-evaluator';

export interface ValidationError {
  ruleId: string;
  message: Record<string, string>;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

@Injectable()
export class ValidationRunner {
  constructor(private readonly prisma: PrismaService) {}

  async run(
    workspaceId: string,
    entityType: string,
    record: Record<string, unknown>,
  ): Promise<ValidationResult> {
    const rules = await this.prisma.validationRule.findMany({
      where: { workspaceId, entityType, enabled: true },
    });

    const errors: ValidationError[] = [];

    for (const rule of rules) {
      const expression = rule.expression as unknown as ConditionTree;
      const passes = evaluateConditions(record, expression);
      if (!passes) {
        errors.push({
          ruleId: rule.id,
          message: rule.errorMessage as Record<string, string>,
        });
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

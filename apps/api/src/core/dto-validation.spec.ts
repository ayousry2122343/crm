import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreatePersonDto } from '../crm/people/dto/create-person.dto';
import { CreateDealDto } from '../crm/deals/dto/create-deal.dto';
import { CreateScoringRuleDto } from '../crm/scoring/dto/create-scoring-rule.dto';
import { CreateGoalDto } from '../crm/goals/dto/create-goal.dto';
import { CreateCommentDto } from '../comments/dto/create-comment.dto';

describe('DTO Validation', () => {
  describe('CreatePersonDto', () => {
    it('accepts valid person with all optional fields', async () => {
      const dto = plainToInstance(CreatePersonDto, {
        firstName: 'Ahmed',
        lastName: 'Yousry',
        email: 'ahmed@test.com',
        lifecycleStage: 'LEAD',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('accepts empty object (all fields optional)', async () => {
      const dto = plainToInstance(CreatePersonDto, {});
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('rejects invalid email format', async () => {
      const dto = plainToInstance(CreatePersonDto, { email: 'not-an-email' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const emailError = errors.find((e) => e.property === 'email');
      expect(emailError).toBeDefined();
    });

    it('rejects invalid lifecycleStage', async () => {
      const dto = plainToInstance(CreatePersonDto, { lifecycleStage: 'INVALID' });
      const errors = await validate(dto);
      const stageError = errors.find((e) => e.property === 'lifecycleStage');
      expect(stageError).toBeDefined();
    });

    it('accepts all valid lifecycle stages', async () => {
      for (const stage of ['LEAD', 'MQL', 'SQL', 'OPP', 'CUSTOMER', 'EVANGELIST']) {
        const dto = plainToInstance(CreatePersonDto, { lifecycleStage: stage });
        const errors = await validate(dto);
        expect(errors.filter((e) => e.property === 'lifecycleStage')).toHaveLength(0);
      }
    });
  });

  describe('CreateDealDto', () => {
    it('accepts valid deal', async () => {
      const dto = plainToInstance(CreateDealDto, {
        name: 'Big Deal',
        pipelineId: 'pip_1',
        stageId: 's_1',
        amount: 5000,
        probability: 50,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('rejects missing name', async () => {
      const dto = plainToInstance(CreateDealDto, {
        pipelineId: 'pip_1',
        stageId: 's_1',
      });
      const errors = await validate(dto);
      const nameError = errors.find((e) => e.property === 'name');
      expect(nameError).toBeDefined();
    });

    it('rejects missing pipelineId', async () => {
      const dto = plainToInstance(CreateDealDto, {
        name: 'Deal',
        stageId: 's_1',
      });
      const errors = await validate(dto);
      const pipelineError = errors.find((e) => e.property === 'pipelineId');
      expect(pipelineError).toBeDefined();
    });

    it('rejects probability > 100', async () => {
      const dto = plainToInstance(CreateDealDto, {
        name: 'Deal',
        pipelineId: 'pip_1',
        stageId: 's_1',
        probability: 150,
      });
      const errors = await validate(dto);
      const probError = errors.find((e) => e.property === 'probability');
      expect(probError).toBeDefined();
    });

    it('rejects probability < 0', async () => {
      const dto = plainToInstance(CreateDealDto, {
        name: 'Deal',
        pipelineId: 'pip_1',
        stageId: 's_1',
        probability: -10,
      });
      const errors = await validate(dto);
      const probError = errors.find((e) => e.property === 'probability');
      expect(probError).toBeDefined();
    });
  });

  describe('CreateScoringRuleDto', () => {
    it('accepts valid scoring rule', async () => {
      const dto = plainToInstance(CreateScoringRuleDto, {
        name: 'Lead Score',
        entityType: 'PERSON',
        rules: [{ field: 'email', operator: 'IS_SET', value: null, points: 10 }],
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('rejects invalid entityType', async () => {
      const dto = plainToInstance(CreateScoringRuleDto, {
        name: 'Score',
        entityType: 'INVALID',
        rules: [],
      });
      const errors = await validate(dto);
      const etError = errors.find((e) => e.property === 'entityType');
      expect(etError).toBeDefined();
    });

    it('rejects missing name', async () => {
      const dto = plainToInstance(CreateScoringRuleDto, {
        entityType: 'PERSON',
        rules: [],
      });
      const errors = await validate(dto);
      const nameError = errors.find((e) => e.property === 'name');
      expect(nameError).toBeDefined();
    });
  });

  describe('CreateGoalDto', () => {
    it('accepts valid goal', async () => {
      const dto = plainToInstance(CreateGoalDto, {
        name: 'Q1 Revenue',
        metric: 'REVENUE',
        targetValue: 100000,
        period: 'QUARTERLY',
        startDate: '2026-01-01',
        endDate: '2026-03-31',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('rejects invalid metric', async () => {
      const dto = plainToInstance(CreateGoalDto, {
        name: 'Goal',
        metric: 'INVALID',
        targetValue: 100,
        period: 'MONTHLY',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });
      const errors = await validate(dto);
      const metricError = errors.find((e) => e.property === 'metric');
      expect(metricError).toBeDefined();
    });

    it('rejects missing name', async () => {
      const dto = plainToInstance(CreateGoalDto, {
        metric: 'REVENUE',
        targetValue: 100,
        period: 'MONTHLY',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });
      const errors = await validate(dto);
      const nameError = errors.find((e) => e.property === 'name');
      expect(nameError).toBeDefined();
    });

    it('accepts all valid metric types', async () => {
      for (const metric of ['REVENUE', 'DEAL_COUNT', 'ACTIVITY_COUNT', 'WON_DEAL_COUNT', 'AVG_DEAL_SIZE', 'CUSTOM']) {
        const dto = plainToInstance(CreateGoalDto, {
          name: 'G',
          metric,
          targetValue: 1,
          period: 'Q',
          startDate: '2026-01-01',
          endDate: '2026-03-31',
        });
        const errors = await validate(dto);
        expect(errors.filter((e) => e.property === 'metric')).toHaveLength(0);
      }
    });
  });

  describe('CreateCommentDto', () => {
    it('accepts valid comment', async () => {
      const dto = plainToInstance(CreateCommentDto, {
        entityType: 'DEAL',
        entityId: 'd_1',
        body: 'Hello world',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('rejects empty body', async () => {
      const dto = plainToInstance(CreateCommentDto, {
        entityType: 'DEAL',
        entityId: 'd_1',
        body: '',
      });
      const errors = await validate(dto);
      const bodyError = errors.find((e) => e.property === 'body');
      expect(bodyError).toBeDefined();
    });

    it('rejects missing entityId', async () => {
      const dto = plainToInstance(CreateCommentDto, {
        entityType: 'DEAL',
        body: 'Hi',
      });
      const errors = await validate(dto);
      const idError = errors.find((e) => e.property === 'entityId');
      expect(idError).toBeDefined();
    });

    it('rejects invalid entityType', async () => {
      const dto = plainToInstance(CreateCommentDto, {
        entityType: 'INVALID',
        entityId: 'x',
        body: 'Hi',
      });
      const errors = await validate(dto);
      const typeError = errors.find((e) => e.property === 'entityType');
      expect(typeError).toBeDefined();
    });

    it('accepts all valid entity types', async () => {
      for (const entityType of ['PERSON', 'COMPANY', 'DEAL', 'ACTIVITY', 'TICKET', 'BLOG']) {
        const dto = plainToInstance(CreateCommentDto, {
          entityType,
          entityId: 'id_1',
          body: 'Comment',
        });
        const errors = await validate(dto);
        expect(errors.filter((e) => e.property === 'entityType')).toHaveLength(0);
      }
    });

    it('accepts optional parentId for threaded comments', async () => {
      const dto = plainToInstance(CreateCommentDto, {
        entityType: 'DEAL',
        entityId: 'd_1',
        body: 'Reply',
        parentId: 'c_parent',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});

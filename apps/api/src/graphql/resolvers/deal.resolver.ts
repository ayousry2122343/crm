import { Resolver, Query, Mutation, Args, Int, Float, ID, ObjectType, Field, InputType } from '@nestjs/graphql';
import { DealService } from '../../crm/deals/deal.service';

@ObjectType()
export class DealType {
  @Field(() => ID) id!: string;
  @Field() name!: string;
  @Field(() => Float, { nullable: true }) amount?: number;
  @Field() status!: string;
  @Field({ nullable: true }) stageId?: string;
  @Field({ nullable: true }) pipelineId?: string;
  @Field({ nullable: true }) ownerId?: string;
  @Field() createdAt!: Date;
}

@InputType()
export class CreateDealInput {
  @Field() name!: string;
  @Field(() => Float, { nullable: true }) amount?: number;
  @Field({ nullable: true }) pipelineId?: string;
  @Field({ nullable: true }) stageId?: string;
}

@InputType()
export class UpdateDealInput {
  @Field({ nullable: true }) name?: string;
  @Field(() => Float, { nullable: true }) amount?: number;
  @Field({ nullable: true }) stageId?: string;
}

@Resolver(() => DealType)
export class DealResolver {
  constructor(private readonly dealService: DealService) {}

  @Query(() => [DealType])
  async deals(
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
    @Args('offset', { type: () => Int, nullable: true }) offset?: number,
    @Args('status', { nullable: true }) status?: string,
    @Args('pipelineId', { nullable: true }) pipelineId?: string,
  ) {
    const result = await this.dealService.list({ limit, status, pipelineId } as any);
    return result.items;
  }

  @Query(() => DealType, { nullable: true })
  async deal(@Args('id', { type: () => ID }) id: string) {
    return this.dealService.get(id);
  }

  @Mutation(() => DealType)
  async createDeal(@Args('input') input: CreateDealInput) {
    return this.dealService.create(input as any);
  }

  @Mutation(() => DealType)
  async updateDeal(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateDealInput,
  ) {
    return this.dealService.update(id, input as any);
  }
}

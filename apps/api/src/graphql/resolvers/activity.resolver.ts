import { Resolver, Query, Mutation, Args, Int, ID, ObjectType, Field, InputType } from '@nestjs/graphql';
import { ActivityService } from '../../crm/activities/activity.service';

@ObjectType()
export class ActivityType {
  @Field(() => ID) id!: string;
  @Field() type!: string;
  @Field() subject!: string;
  @Field({ nullable: true }) dueDate?: Date;
  @Field() completed!: boolean;
  @Field({ nullable: true }) personId?: string;
  @Field({ nullable: true }) dealId?: string;
  @Field() createdAt!: Date;
}

@InputType()
export class CreateActivityInput {
  @Field() type!: string;
  @Field() subject!: string;
  @Field({ nullable: true }) dueDate?: Date;
  @Field({ nullable: true }) personId?: string;
  @Field({ nullable: true }) dealId?: string;
}

@Resolver(() => ActivityType)
export class ActivityResolver {
  constructor(private readonly activityService: ActivityService) {}

  @Query(() => [ActivityType])
  async activities(
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
    @Args('offset', { type: () => Int, nullable: true }) offset?: number,
    @Args('type', { nullable: true }) type?: string,
    @Args('completed', { nullable: true }) completed?: boolean,
  ) {
    const result = await this.activityService.list({ limit, type, completed } as any);
    return result.items;
  }

  @Mutation(() => ActivityType)
  async createActivity(@Args('input') input: CreateActivityInput) {
    return this.activityService.create(input as any);
  }

  @Mutation(() => ActivityType)
  async completeActivity(@Args('id', { type: () => ID }) id: string) {
    return this.activityService.complete(id);
  }
}

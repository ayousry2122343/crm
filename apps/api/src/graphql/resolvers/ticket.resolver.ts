import { Resolver, Query, Mutation, Args, Int, ID, ObjectType, Field, InputType } from '@nestjs/graphql';
import { TicketService } from '../../crm/tickets/ticket.service';

@ObjectType()
export class TicketType {
  @Field(() => ID) id!: string;
  @Field(() => Int) ticketNumber!: number;
  @Field() subject!: string;
  @Field({ nullable: true }) description?: string;
  @Field() status!: string;
  @Field() priority!: string;
  @Field() channel!: string;
  @Field({ nullable: true }) assigneeId?: string;
  @Field() createdAt!: Date;
}

@InputType()
export class CreateTicketInput {
  @Field() subject!: string;
  @Field({ nullable: true }) description?: string;
  @Field({ nullable: true }) priority?: string;
  @Field({ nullable: true }) channel?: string;
}

@Resolver(() => TicketType)
export class TicketResolver {
  constructor(private readonly ticketService: TicketService) {}

  @Query(() => [TicketType])
  async tickets(
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
    @Args('offset', { type: () => Int, nullable: true }) offset?: number,
    @Args('status', { nullable: true }) status?: string,
    @Args('priority', { nullable: true }) priority?: string,
  ) {
    const result = await this.ticketService.list({ limit, status, priority } as any);
    return result.items;
  }

  @Query(() => TicketType, { nullable: true })
  async ticket(@Args('id', { type: () => ID }) id: string) {
    return this.ticketService.get(id);
  }

  @Mutation(() => TicketType)
  async createTicket(@Args('input') input: CreateTicketInput) {
    return this.ticketService.create(input as any);
  }

  @Mutation(() => TicketType)
  async updateTicketStatus(
    @Args('id', { type: () => ID }) id: string,
    @Args('status') status: string,
  ) {
    return this.ticketService.changeStatus(id, { status } as any);
  }
}

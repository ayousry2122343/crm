import { Resolver, Query, Mutation, Args, Int, ID, ObjectType, Field, InputType } from '@nestjs/graphql';
import { PersonService } from '../../crm/people/person.service';

@ObjectType()
export class PersonType {
  @Field(() => ID) id!: string;
  @Field() fullName!: string;
  @Field({ nullable: true }) email?: string;
  @Field({ nullable: true }) phone?: string;
  @Field({ nullable: true }) companyName?: string;
  @Field(() => Int, { nullable: true }) score?: number;
  @Field({ nullable: true }) ownerId?: string;
  @Field() createdAt!: Date;
}

@InputType()
export class CreatePersonInput {
  @Field({ nullable: true }) firstName?: string;
  @Field({ nullable: true }) lastName?: string;
  @Field({ nullable: true }) email?: string;
  @Field({ nullable: true }) phone?: string;
  @Field({ nullable: true }) companyName?: string;
}

@InputType()
export class UpdatePersonInput {
  @Field({ nullable: true }) firstName?: string;
  @Field({ nullable: true }) lastName?: string;
  @Field({ nullable: true }) email?: string;
  @Field({ nullable: true }) phone?: string;
  @Field({ nullable: true }) companyName?: string;
}

@Resolver(() => PersonType)
export class PersonResolver {
  constructor(private readonly personService: PersonService) {}

  @Query(() => [PersonType])
  async people(
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
    @Args('offset', { type: () => Int, nullable: true }) offset?: number,
    @Args('search', { nullable: true }) search?: string,
  ) {
    const result = await this.personService.list({ limit, search });
    return result.items;
  }

  @Query(() => PersonType, { nullable: true })
  async person(@Args('id', { type: () => ID }) id: string) {
    return this.personService.get(id);
  }

  @Mutation(() => PersonType)
  async createPerson(@Args('input') input: CreatePersonInput) {
    return this.personService.create(input as any);
  }

  @Mutation(() => PersonType)
  async updatePerson(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdatePersonInput,
  ) {
    return this.personService.update(id, input as any);
  }
}

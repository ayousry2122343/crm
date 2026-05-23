import { Module } from '@nestjs/common';
import { GraphQLModule as NestGraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { PeopleModule } from '../crm/people/people.module';
import { DealModule } from '../crm/deals/deal.module';
import { TicketModule } from '../crm/tickets/ticket.module';
import { ActivityModule } from '../crm/activities/activity.module';
import { PersonResolver } from './resolvers/person.resolver';
import { DealResolver } from './resolvers/deal.resolver';
import { TicketResolver } from './resolvers/ticket.resolver';
import { ActivityResolver } from './resolvers/activity.resolver';
import { DashboardResolver } from './resolvers/dashboard.resolver';

@Module({
  imports: [
    NestGraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      playground: process.env.NODE_ENV !== 'production',
      path: '/graphql',
    }),
    PeopleModule,
    DealModule,
    TicketModule,
    ActivityModule,
  ],
  providers: [
    PersonResolver,
    DealResolver,
    TicketResolver,
    ActivityResolver,
    DashboardResolver,
  ],
})
export class CrmGraphQLModule {}

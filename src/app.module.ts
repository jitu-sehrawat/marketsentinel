import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { JobsModule } from './jobs/jobs.module';
import { MongooseModelsModule } from './schemas/mongoose-models.module';
import { CompaniesModule } from './companies/company.module';
import { QuotesModule } from './quotes/quote.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    MongooseModelsModule,
    UsersModule,
    JobsModule,
    CompaniesModule,
    QuotesModule,
  ],
  controllers: [],
})
export class AppModule {}

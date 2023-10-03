import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { JobsModule } from './jobs/jobs.module';
import { MongooseModelsModule } from './schemas/mongoose-models.module';
import { CompaniesModule } from './companies/company.module';
import { QuotesModule } from './quotes/quote.module';
import { AnalysisModule } from './analysis/analysis.module';
import { SectorModule } from './analysis/sector/sector.module';
import { RouterModule } from '@nestjs/core';

const analysisRoutes = [
  {
    path: 'analysis',
    module: AnalysisModule,
    children: [
      {
        path: 'sector',
        module: SectorModule,
      },
    ],
  },
];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    MongooseModelsModule,
    UsersModule,
    JobsModule,
    CompaniesModule,
    QuotesModule,
    AnalysisModule,
    SectorModule,
    RouterModule.register(analysisRoutes),
  ],
  controllers: [],
})
export class AppModule {}

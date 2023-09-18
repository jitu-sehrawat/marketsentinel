import { Module } from '@nestjs/common';
import { QuotesController } from './quote.controller';
import { QuotesService } from './quote.service';
import { CompaniesService } from 'src/companies/company.service';

@Module({
  imports: [],
  controllers: [QuotesController],
  providers: [QuotesService, CompaniesService],
  exports: [QuotesService],
})
export class QuotesModule {}

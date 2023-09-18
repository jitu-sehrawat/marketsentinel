import { Module } from '@nestjs/common';
import { QuotesController } from './quote.controller';
import { QuotesService } from './quote.service';
import { CompaniesService } from 'src/companies/company.service';
import { NSEService } from 'src/companies/nse.service';

@Module({
  imports: [],
  controllers: [QuotesController],
  providers: [QuotesService, CompaniesService, NSEService],
  exports: [QuotesService],
})
export class QuotesModule {}

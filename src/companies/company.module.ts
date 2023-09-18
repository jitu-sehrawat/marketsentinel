import { Module } from '@nestjs/common';
import { CompaniesController } from './company.controller';
import { CompaniesService } from './company.service';
import { NSEService } from './nse.service';

@Module({
  imports: [],
  controllers: [CompaniesController],
  providers: [CompaniesService, NSEService],
  exports: [CompaniesService, NSEService],
})
export class CompaniesModule {}

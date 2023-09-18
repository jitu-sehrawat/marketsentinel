import { Module } from '@nestjs/common';
import { CompaniesController } from './company.controller';
import { CompaniesService } from './company.service';

@Module({
  imports: [],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}

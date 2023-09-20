import { Body, Controller, Get, Post } from '@nestjs/common';
import { CompaniesService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  getAll() {
    return this.companiesService.getAll();
  }

  @Post('')
  bulkCreate(@Body() bulkCreateCompany) {
    return this.companiesService.bulkCreate(bulkCreateCompany);
  }

  @Post('/company')
  create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companiesService.createCompany(createCompanyDto);
  }

  @Get('/historicaldata')
  getHistoricalData() {
    return this.companiesService.getHistoricalData();
  }

  @Get('/convertCSVtoJSON')
  getConvertCSVtoJSON() {
    return this.companiesService.convertCSVtoJSON();
  }
}

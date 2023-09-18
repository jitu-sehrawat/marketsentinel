import { Controller, Get } from '@nestjs/common';
import { QuotesService } from './quote.service';

@Controller('/quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Get('')
  getAll() {
    return this.quotesService.getAll();
  }

  @Get('syncdailyquotes')
  syncDailyQuotes() {
    return this.quotesService.syncDailyQuotes();
  }
}

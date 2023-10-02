import { Controller, Delete, Get } from '@nestjs/common';
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

  @Get('insertHistoricalJSONtoDB')
  insertHistoricalJSONtoDB() {
    return this.quotesService.insertHistoricalJSONtoDB();
  }

  @Delete('removedailyquotes')
  removedailyquotes() {
    return this.quotesService.removedailyquotes();
  }

  @Get('backfillCurrentPreviousQuater')
  backfillCurrentPreviousQuaterQuotes() {
    return this.quotesService.backfillCurrentPreviousQuaterQuotes();
  }
}

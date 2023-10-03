import { Controller, Get } from '@nestjs/common';

@Controller('')
export class AnalysisController {
  constructor() {}

  @Get('')
  getAll() {
    return 'Hello from analysis';
  }
}

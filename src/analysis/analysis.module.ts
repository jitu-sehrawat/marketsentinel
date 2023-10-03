import { Module } from '@nestjs/common';
import { AnalysisController } from './analysis.controller';
import { SectorModule } from './sector/sector.module';

@Module({
  imports: [SectorModule],
  controllers: [AnalysisController],
  providers: [],
  exports: [],
})
export class AnalysisModule {}

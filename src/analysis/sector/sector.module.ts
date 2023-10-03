import { Module } from '@nestjs/common';
import { SectorController } from './sector.controller';
import { SectorService } from './sector.service';

@Module({
  imports: [],
  controllers: [SectorController],
  providers: [SectorService],
  exports: [],
})
export class SectorModule {}

import { Body, Controller, Get } from '@nestjs/common';
import { SectorService } from './sector.service';
import { SectorTypeDTO } from './dto/sectortype.dto';

@Controller('')
export class SectorController {
  constructor(private readonly sectorService: SectorService) {}

  @Get('')
  healthcheck() {
    return 'Hello from Sector';
  }

  @Get('all')
  listSector() {
    return this.sectorService.listSectors();
  }

  @Get('list/')
  listBySectorType(@Body() body: SectorTypeDTO) {
    return this.sectorService.listBySectorType(body.sectorType);
  }

  @Get('companies')
  companiesBySectorType(@Body() body: SectorTypeDTO) {
    return this.sectorService.companiesGroupedBySectorType(body.sectorType);
  }

  @Get('indicies')
  indicesGroupBySectorType(@Body() body: SectorTypeDTO) {
    return this.sectorService.indicesGroupBySectorType(body.sectorType);
  }
}

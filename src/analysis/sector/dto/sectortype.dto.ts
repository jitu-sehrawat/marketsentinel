import { IsEnum, IsNotEmpty } from 'class-validator';

export enum SECTOR_TYPE {
  SECTOR = 'sector',
  MACRO = 'macro',
  INDUSTRY = 'industry',
  BASICINDUSTRY = 'basicIndustry',
}

export class SectorTypeDTO {
  @IsEnum(SECTOR_TYPE)
  @IsNotEmpty()
  sectorType: SECTOR_TYPE; // This will help us using Typescript.
}

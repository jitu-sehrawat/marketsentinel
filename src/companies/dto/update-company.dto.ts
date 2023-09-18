import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';
import { IndustryInfoDTO } from './industry-info.dto';
import { Type } from 'class-transformer';

export class UpdateCompanyDto {
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsString()
  @IsNotEmpty()
  isin: string;

  @IsString()
  series: string;

  @IsDateString()
  @IsNotEmpty()
  listingDate: string;

  @IsNumber()
  // @IsNotEmpty()
  symbolPe: number;

  @IsNumber()
  // @IsNotEmpty()
  sectorPe: number;

  @IsString()
  sectorInd: string;

  @IsNumber()
  // @IsNotEmpty()
  issuedSize: number;

  @IsNumber()
  // @IsNotEmpty()
  faceValue: number;

  @IsString()
  sectorIndustry: string;

  @Type(() => IndustryInfoDTO)
  @ValidateNested()
  @IsNotEmpty()
  industryInfo: IndustryInfoDTO;
}

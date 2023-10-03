import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { COMPANY_MODEL, ICompanyModel } from 'src/schemas/company';
import { SECTOR_TYPE } from './dto/sectortype.dto';

@Injectable()
export class SectorService {
  constructor(
    @InjectModel(COMPANY_MODEL) private readonly companyModel: ICompanyModel,
  ) {}

  // List all the sectors groups by categorisation
  async listSectors() {
    const list = await this.companyModel.aggregate([
      {
        $group: {
          _id: null,
          sector: {
            $addToSet: '$industryInfo.sector',
          },
          macro: {
            $addToSet: '$industryInfo.macro',
          },
          industry: {
            $addToSet: '$industryInfo.industry',
          },
          basicIndustry: {
            $addToSet: '$industryInfo.basicIndustry',
          },
        },
      },
    ]);

    return list[0];
  }

  // List by sector type
  async listBySectorType(sectorType: SECTOR_TYPE) {
    const listSectors = await this.listSectors();
    return listSectors[sectorType];
  }

  // List of companies for a sector type
  private async companiesBySectorType(sectorType: SECTOR_TYPE) {
    const sectorsList = await this.listBySectorType(sectorType);

    const response = {};
    for (const sector of sectorsList) {
      let query = {};

      if (sectorType == SECTOR_TYPE.SECTOR) {
        query = {
          'industryInfo.sector': sector,
        };
      } else if (sectorType == SECTOR_TYPE.MACRO) {
        query = {
          'industryInfo.macro': sector,
        };
      } else if (sectorType == SECTOR_TYPE.INDUSTRY) {
        query = {
          'industryInfo.industry': sector,
        };
      } else if (sectorType == SECTOR_TYPE.BASICINDUSTRY) {
        query = {
          'industryInfo.basicIndustry': sector,
        };
      } else {
        return 'Sector type not found';
      }

      const companies = await this.companyModel.find(query);
      response[sector] = companies;
    }

    return response;
  }

  async companiesGroupedBySectorType(sectorType: SECTOR_TYPE) {
    const data = await this.companiesBySectorType(sectorType);

    return data;
  }
}

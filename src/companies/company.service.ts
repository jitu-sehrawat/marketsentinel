import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { COMPANY_MODEL, ICompanyModel } from 'src/schemas/company';
import { CreateCompanyDto, UpdateCompanyDto } from './dto';
import { NSEService } from './nse.service';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectModel(COMPANY_MODEL) private readonly companyModel: ICompanyModel,
    private readonly nseService: NSEService,
  ) {}

  async getAll() {
    try {
      return await this.companyModel.find();
    } catch (error) {
      throw new ServiceUnavailableException();
    }
  }

  async get(symbol: string) {
    try {
      return await this.companyModel.find({ symbol: symbol });
    } catch (error) {
      throw new ServiceUnavailableException();
    }
  }

  // sanitizeSymbol(symbol) {
  //   if (flaggedSymbols.hasOwnProperty(symbol)) {
  //     return flaggedSymbols[symbol];
  //   }

  //   return symbol;
  // }

  // async getHeaders() {
  //   const response: AxiosResponse = await axios({
  //     method: 'GET',
  //     url: `https://www.nseindia.com/get-quotes/equity?symbol=INFY`,
  //   }).catch(() => {
  //     throw new ForbiddenException('API not available');
  //   });

  //   const cookie = `${response.headers['set-cookie'].join(';')}`;
  //   const headers = {
  //     authority: 'www.nseindia.com',
  //     accept: '*/*',
  //     'accept-language': 'en-US,en;q=0.9',
  //     cookie: cookie,
  //     dnt: '1',
  //     'sec-ch-ua':
  //       '"Chromium";v="116", "Not)A;Brand";v="24", "Google Chrome";v="116"',
  //     'sec-ch-ua-mobile': '?0',
  //     'sec-ch-ua-platform': '"Linux"',
  //     'sec-fetch-dest': 'empty',
  //     'sec-fetch-mode': 'cors',
  //     'sec-fetch-site': 'same-origin',
  //     'user-agent':
  //       'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
  //   };

  //   return {
  //     headers: headers,
  //   };
  // }

  // // This contains the company Info and price info
  // async getCompanyFromNSE(nseSymbol: string): Promise<ICompanyNSE> {
  //   const { headers } = await this.getHeaders();

  //   headers[
  //     'referer'
  //   ] = `https://www.nseindia.com/get-quotes/equity?symbol=${nseSymbol}`;
  //   const response = await axios({
  //     method: 'GET',
  //     url: `https://www.nseindia.com/api/quote-equity?symbol=${nseSymbol}`,
  //     headers: headers,
  //   }).catch((e) => {
  //     console.log(`Error: getCompanyFromNSE: `, e);
  //     throw new ForbiddenException('getCompanyFromNSE: API not available');
  //   });

  //   HEADERS = headers;

  //   return response.data;
  // }
  // async getCompanyDailyDeliveryFromNSE(
  //   nseSymbol: string,
  // ): Promise<IDeliveryDailyNSE> {
  //   const headers = HEADERS;
  //   // const { headers } = await this.getHeaders();
  //   headers[
  //     'referer'
  //   ] = `https://www.nseindia.com/get-quotes/equity?symbol=${nseSymbol}`;
  //   const response = await axios({
  //     method: 'GET',
  //     url: `https://www.nseindia.com/api/quote-equity?symbol=${nseSymbol}&section=trade_info`,
  //     headers: headers,
  //   }).catch((e) => {
  //     console.log(`Error: getCompanyDailyDeliveryFromNSE: `, e);
  //     throw new ForbiddenException(
  //       'getCompanyDailyDeliveryFromNSE: API not available',
  //     );
  //   });

  //   return response.data;
  // }

  async createCompany(createCompanyDto: CreateCompanyDto) {
    try {
      // Saving the Symbol in DB
      const company = await this.companyModel.create(createCompanyDto);

      // Getting data for Symbol from NSE
      // const nseData = await this.getCompanyFromNSE(company.symbol);
      const nseData = await this.nseService.getCompanyFromNSE(company.symbol);

      // Building UpdateCompanyDto object to update the newly added symbol
      const updateDetails: UpdateCompanyDto = {
        symbol: nseData.info.symbol,
        companyName: nseData.info.companyName,
        isin: nseData.metadata.isin,
        series: nseData.metadata.series,
        listingDate: nseData.metadata.listingDate,
        symbolPe: isNaN(nseData.metadata.pdSymbolPe)
          ? 0
          : nseData.metadata.pdSymbolPe,
        sectorPe: isNaN(nseData.metadata.pdSectorPe)
          ? 0
          : nseData.metadata.pdSectorPe,
        sectorInd: nseData.metadata.pdSectorInd,
        issuedSize: isNaN(nseData.securityInfo.issuedSize)
          ? 0
          : nseData.securityInfo.issuedSize,
        faceValue: isNaN(nseData.securityInfo.faceValue)
          ? 0
          : nseData.securityInfo.faceValue,
        sectorIndustry: nseData.metadata.industry,
        industryInfo: {
          macro: nseData.industryInfo.macro,
          sector: nseData.industryInfo.sector,
          industry: nseData.industryInfo.industry,
          basicIndustry: nseData.industryInfo.basicIndustry,
        },
      };

      // Calling update function
      const companyDetails = await this.updateCompany(updateDetails);

      return companyDetails;
    } catch (error) {
      if (error.name === 'ValidationError') {
        throw new BadRequestException(error.errors);
      }

      if (error.code === 11000) {
        throw new BadRequestException(`${error.keyValue.symbol} already exist`);
      }

      throw new ServiceUnavailableException();
    }
  }

  async updateCompany(updateCompanyDto: UpdateCompanyDto) {
    try {
      // Updating the existing record with new NSE data
      const company = await this.companyModel.findOneAndUpdate(
        {
          symbol: updateCompanyDto.symbol,
        },
        {
          ...updateCompanyDto,
        },
        {
          new: true,
        },
      );

      if (!company) {
        throw new NotFoundException(
          `${updateCompanyDto.symbol} Not found in DB`,
        );
      }

      return company;
    } catch (error) {
      if (error.name === 'ValidationError') {
        throw new BadRequestException(error.errors);
      }

      throw new ServiceUnavailableException();
    }
  }

  async bulkCreate(bulkCreateCompany) {
    try {
      const companies = [];
      const failedSymbols = [];
      for (const symbol of bulkCreateCompany.symbol) {
        const createCompany: CreateCompanyDto = {
          symbol: this.nseService.sanitizeSymbol(symbol),
        };
        let company = {};
        try {
          company = await this.createCompany(createCompany);
        } catch (error) {
          console.log(`bulkCreateCompany: Error: `, Error);
          failedSymbols.push(symbol);
        }
        companies.push(company);
      }
      return { companies, failedSymbols };
    } catch (error) {
      console.log(error);
      if (error.name === 'ValidationError') {
        throw new BadRequestException(error.errors);
      }

      throw new ServiceUnavailableException();
    }
  }
}

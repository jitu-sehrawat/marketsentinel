import axios, { AxiosResponse } from 'axios';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { COMPANY_MODEL, ICompanyModel } from 'src/schemas/company';
import { CreateCompanyDto, UpdateCompanyDto } from './dto';
import { ICompanyNSE, IDeliveryDailyNSE } from './interface';

const flaggedSymbols = {
  'M&M': 'M%26M',
  'M&MFIN': 'M%26MFIN',
  'L&TFH': 'L%26TFH',
  PVR: 'PVRINOX',
  SUNCLAYLTD: 'TVSHLTD',
  'J&KBANK': 'J%26KBANK',
  TWL: 'TITAGARH',
  'GET&D': 'GET%26D',
  'GMRP&UI': 'GMRP%26UI',
  '4THDIM': 'FOURTHDIM',
  BINDALAGRO: 'OSWALGREEN',
  NXTDIGITAL: 'NDLVENTURE',
  UCALFUEL: 'UCAL',
  'IL&FSENGG': 'IL%26FSENGG',
  'SURANAT&P': 'SURANAT%26P',
  'IL&FSTRANS': 'IL%26FSTRANS',
  SEPOWER: 'SAMPANN',
  MFL: 'EPIGRAL',
};

let HEADERS = {};

@Injectable()
export class CompaniesService {
  constructor(
    @InjectModel(COMPANY_MODEL) private readonly companyModel: ICompanyModel,
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

  sanitizeSymbol(symbol) {
    if (flaggedSymbols.hasOwnProperty(symbol)) {
      return flaggedSymbols[symbol];
    }

    return symbol;
  }

  async getHeaders() {
    const response: AxiosResponse = await axios({
      method: 'GET',
      url: `https://www.nseindia.com/get-quotes/equity?symbol=INFY`,
    }).catch(() => {
      throw new ForbiddenException('API not available');
    });

    const cookie = `${response.headers['set-cookie'].join(';')}`;
    const headers = {
      authority: 'www.nseindia.com',
      accept: '*/*',
      'accept-language': 'en-US,en;q=0.9',
      cookie: cookie,
      dnt: '1',
      'sec-ch-ua':
        '"Chromium";v="116", "Not)A;Brand";v="24", "Google Chrome";v="116"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Linux"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'user-agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
    };

    return {
      headers: headers,
    };
  }

  // This contains the company Info and price info
  async getCompanyFromNSE(nseSymbol: string): Promise<ICompanyNSE> {
    const { headers } = await this.getHeaders();

    headers[
      'referer'
    ] = `https://www.nseindia.com/get-quotes/equity?symbol=${nseSymbol}`;
    const response = await axios({
      method: 'GET',
      url: `https://www.nseindia.com/api/quote-equity?symbol=${nseSymbol}`,
      headers: headers,
    }).catch((e) => {
      console.log(`Error: getCompanyFromNSE: `, e);
      throw new ForbiddenException('getCompanyFromNSE: API not available');
    });

    HEADERS = headers;

    return response.data;
  }
  async getCompanyDailyDeliveryFromNSE(
    nseSymbol: string,
  ): Promise<IDeliveryDailyNSE> {
    const headers = HEADERS;
    // const { headers } = await this.getHeaders();
    headers[
      'referer'
    ] = `https://www.nseindia.com/get-quotes/equity?symbol=${nseSymbol}`;
    const response = await axios({
      method: 'GET',
      url: `https://www.nseindia.com/api/quote-equity?symbol=${nseSymbol}&section=trade_info`,
      headers: headers,
    }).catch((e) => {
      console.log(`Error: getCompanyDailyDeliveryFromNSE: `, e);
      throw new ForbiddenException(
        'getCompanyDailyDeliveryFromNSE: API not available',
      );
    });

    return response.data;
  }

  async createCompany(createCompanyDto: CreateCompanyDto) {
    try {
      // Saving the Symbol in DB
      const company = await this.companyModel.create(createCompanyDto);

      // Getting data for Symbol from NSE
      const nseData = await this.getCompanyFromNSE(company.symbol);

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
          symbol: this.sanitizeSymbol(symbol),
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
// fetch(
//   'https://www.nseindia.com/api/quote-equity?symbol=INFY&section=trade_info',
//   {
//     headers: {
//       accept: '*/*',
//       'accept-language': 'en-US,en;q=0.9',
//       'sec-ch-ua':
//         '"Google Chrome";v="117", "Not;A=Brand";v="8", "Chromium";v="117"',
//       'sec-ch-ua-mobile': '?0',
//       'sec-ch-ua-platform': '"Linux"',
//       'sec-fetch-dest': 'empty',
//       'sec-fetch-mode': 'cors',
//       'sec-fetch-site': 'same-origin',
//       cookie:
//         'nseQuoteSymbols=[{"symbol":"CARBORUNIV","identifier":null,"type":"equity"},{"symbol":"MFL","identifier":null,"type":"equity"},{"symbol":"INFY","identifier":null,"type":"equity"}]; ak_bmsc=94A8A605CF88EA01012FC4F9381B823D~000000000000000000000000000000~YAAQPUo5F+ROCpOKAQAA3s79oRWpEUvBDgG515px9uyRl0CG6ET+2zeswRMM55SXwRAyJ6zTZFZnF6aTtHSUlScpBkN0UtAC/vH5uKvSYYoheRzY84lX8k+gujV6VYywRdp8ZgXCaaYv/uaAvc7HTt9/MN4F2s2mGK17nU/XVsHWN7Af6NM8T0swJNf8e7P7sE4boeEW7s0+QN6L4nprdvPvYeb7RmJXWS7SeGhXDDPb5h+7vmMkbHJHV026tVx2fngq8YYwusnq/IZEUhVOVctC+Me8+qmuzzakdvddRTcNGm/HGz1qmDMCUmy5xave+lm+qHJqMq7Fp3fSAnOgPvZCJbNPDoCVItkISoBCazHQERq2wd0dUzaHfqUYov7bUcNwFo08ffcbkg0l; defaultLang=en; nsit=-WIfqxTSKqfRBzPguZNE_YRi; bm_mi=D3CDBD88BD7AAD1FEA747BC1D692D38D~YAAQTUo5FxOY+pKKAQAAOgJnohWhamfEsYRMTWL6XRr9Iw1gMbhooe/U9lEwdfD6onQZ1vSO1rvF0w0yFvESc+eJzjL+LuHOvKj+uvDOAilXjEYtnMQdqeIOv8ooVLtCOH2sKRFtQeHmbdkXmtCITozpAJfWWHSSe/MpbzxfkAYVwKkJuQyKwFLtCloo6XVxQNMqQDPjquBVVKUoQxdfQrrD60roTJNX2b6RP8x0WgB38XwUOOjne27LthOF+IqJLb4h1bnpDorhsmrphtBEeusJTLZbPAapjrbPQVBUFmjQIT3A5rCRhRUXVCCnecO4mMZeoThxlBKsBsdbqvJZK8u16oQHskGjnK8yJ1UX~1; nseappid=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhcGkubnNlIiwiYXVkIjoiYXBpLm5zZSIsImlhdCI6MTY5NDk0MTc3OCwiZXhwIjoxNjk0OTQ4OTc4fQ.ojAP3CJWbs9GOnxZ7bGuSmPZjTt5O0fKalSmTkpevx8; AKA_A2=A; bm_sv=8D0AF9DD5ADA5CA6799F9A1A446EC68A~YAAQTUo5F0mY+pKKAQAA5hNnohUyLTFa1lGMZMhk7aWXJH4mHskRDuQEZaX/oull3mPW7vpJyCT4vYDaMCmAPHEr5oBkzpFkDjmEBJ8z2mCrgix8haAKgFvPKX6YsY7uED1E7HU2JG1Pzvl57sK7I++tlUyxs8DHwhuvnbtBVC8oIKriby7RiBk9aHalPxnV+ryjiP1sFkWOfhrwSxvp3unMzGpCh8b4ODk6UTTYGSFiOlxmNssIi6zzV0UdzxX4QBRA~1',
//       Referer: 'https://www.nseindia.com/get-quotes/equity?symbol=INFY',
//       'Referrer-Policy': 'strict-origin-when-cross-origin',
//     },
//     body: null,
//     method: 'GET',
//   },
// );
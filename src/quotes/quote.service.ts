import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CompaniesService } from 'src/companies/company.service';
import { IQuoteModel, QUOTE_MODEL } from 'src/schemas/quote';
import { CreateQuoteDto } from './dto';
import axios, { AxiosResponse } from 'axios';
import { IHistoricalQuote } from './interface';
import { IDeliveryDailyNSE } from 'src/companies/interface';
import { NSEService } from 'src/companies/nse.service';

@Injectable()
export class QuotesService {
  constructor(
    @InjectModel(QUOTE_MODEL) private readonly quoteModel: IQuoteModel,
    private readonly companyService: CompaniesService,
    private readonly nseService: NSEService,
  ) {}

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getHeaders() {
    const response: AxiosResponse = await axios({
      method: 'GET',
      url: `https://www.nseindia.com/api/historical/securityArchives?from=16-09-2023&to=17-09-2023&symbol=INFY&dataType=priceVolumeDeliverable&series=ALL`,
    }).catch(() => {
      throw new ForbiddenException('API not available');
    });

    const cookie = `${response.headers['set-cookie'].join(';')}`;
    const headers = {
      accept: '*/*',
      'accept-language': 'en-US,en;q=0.9',
      'sec-ch-ua':
        '"Google Chrome";v="117", "Not;A=Brand";v="8", "Chromium";v="117"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Linux"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      cookie: cookie,
      Referer: 'https://www.nseindia.com/report-detail/eq_security',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    };

    return {
      headers: headers,
    };
  }

  // Need to provide a symbol and historical fromDate and toDate
  private async getHistoricalQuotesFromNSE(
    symbol: string,
    historicalDate: { fromDate: string; toDate: string },
  ): Promise<IHistoricalQuote> {
    const { headers } = await this.nseService.getHeaders();

    const response = await axios({
      method: 'GET',
      url: `https://www.nseindia.com/api/historical/securityArchives?from=${historicalDate.fromDate}&to=${historicalDate.fromDate}&symbol=${symbol}&dataType=priceVolumeDeliverable&series=ALL`,
      headers: headers,
    }).catch(() => {
      throw new ForbiddenException('API not available');
    });

    return response.data;
  }

  async syncDailyQuotes() {
    try {
      const syncedCompanies = [];
      const failedCompanies = [];
      // Get List of all companies
      const companies = await this.companyService.getAll();
      // const companies = await this.companyService.get('INFY');
      // Get nse daily data for the Company
      for (const company of companies) {
        try {
          // const currentYear = new Date().getFullYear();
          // const currentMonth =
          //   new Date().getMonth() + 1 >= 10
          //     ? `${new Date().getMonth() + 1}`
          //     : `0${new Date().getMonth() + 1}`;
          // const currentDay =
          //   new Date().getDate() >= 10
          //     ? new Date().getDate()
          //     : `0${new Date().getDate()}`;
          // const nseData = await this.getHistoricalQuotesFromNSE(
          //   company.symbol,
          //   {
          //     // fromDate: `${currentDay}-${currentMonth}-${currentYear}`,
          //     // toDate: `${currentDay}-${currentMonth}-${currentYear}`,
          //     fromDate: `15-09-2023`,
          //     toDate: `15-09-2023`,
          //   },
          // );

          const hasOHLC = await this.quoteModel.find({
            symbol: company.symbol,
            timestamp: {
              $lt: new Date('Sat, 16 Sep 2023 00:00:00 GMT'),
              $gte: new Date('Fri, 15 Sep 2023 00:00:00 GMT'),
            },
          });

          if (hasOHLC.length) {
            continue;
          }

          const nseData = await this.nseService.getCompanyFromNSE(
            this.nseService.sanitizeSymbol(company.symbol),
          );

          if (nseData?.securityInfo?.tradingStatus == 'Suspended') {
            continue;
          }

          let deliveryData: IDeliveryDailyNSE;
          if (
            nseData?.securityInfo &&
            nseData?.securityInfo.surveillance.surv == null
          ) {
            deliveryData = await this.nseService.getCompanyDailyDeliveryFromNSE(
              this.nseService.sanitizeSymbol(company.symbol),
            );
          }

          const dailyQuote: CreateQuoteDto = {
            symbol: nseData.info.symbol,
            series: nseData.metadata.series,
            open: nseData.priceInfo.open,
            high: nseData.priceInfo.intraDayHighLow.max,
            low: nseData.priceInfo.intraDayHighLow.min,
            close: nseData.priceInfo.close,
            lastTradedPrice: nseData.priceInfo.lastPrice,
            previousClosePrice: nseData.priceInfo.previousClose,
            fiftyTwoWeekHighPrice: nseData.priceInfo.weekHighLow.max,
            fiftyTwoWeekLowPrice: nseData.priceInfo.weekHighLow.min,
            totalTradeQuantity: deliveryData
              ? deliveryData.securityWiseDP.quantityTraded
              : 0,
            totalTradeValue:
              deliveryData?.marketDeptOrderBook.tradeInfo.totalTradedValue,
            totalTrade: 0,
            deliveryQuantity: deliveryData?.securityWiseDP.deliveryQuantity,
            deliveryPercentage:
              deliveryData?.securityWiseDP.deliveryToTradedQuantity,
            vwap: nseData.priceInfo.vwap,
            timestamp:
              nseData.metadata.lastUpdateTime == '-'
                ? new Date('Fri, 15 Sep 2023 00:00:00 GMT').toISOString()
                : nseData.metadata.lastUpdateTime,
          };
          // Save the quote details inside the collection
          await this.createQuote(dailyQuote);
          syncedCompanies.push(company.symbol);
          console.log(`${company.symbol} ohlc inserted`);

          // break;
        } catch (error) {
          console.log(`Error: syncDailyQuotes: ${company.symbol}: `, error);
          failedCompanies.push(company.symbol);
          // break;
        }

        if (syncedCompanies.length % 75 == 0) {
          console.log(`Sleeping for 10 sec===================================`);
          await this.sleep(1000 * 10);
        }
      }

      return { syncedCompanies, failedCompanies };
    } catch (error) {
      if (error.name === 'ValidationError') {
        throw new BadRequestException(error.errors);
      }

      throw new ServiceUnavailableException();
    }
  }

  async getAll() {
    return this.quoteModel.find();
  }

  private async createQuote(dailyQuote: CreateQuoteDto) {
    try {
      // const ohlc = await this.quoteModel.create(dailyQuote);

      const ohlc = await this.quoteModel.updateOne(
        {
          symbol: dailyQuote.symbol,
          timestamp: dailyQuote.timestamp,
        },
        {
          $set: { ...dailyQuote },
        },
        {
          upsert: true,
          new: true,
        },
      );

      return ohlc;
    } catch (error) {
      console.log(`Error: createQuote: `, error);
      if (error.name === 'ValidationError') {
        throw new BadRequestException(error.errors);
      }

      throw new ServiceUnavailableException();
    }
  }
}

// async syncDailyQuotes() {
//   try {
//     const syncedCompanies = [];
//     const failedCompanies = [];
//     // Get List of all companies
//     const companies = await this.companyService.getAll();
//     // const companies = await this.companyService.get('INFY');
//     // Get nse daily data for the Company
//     for (const company of companies) {
//       try {
//         const currentYear = new Date().getFullYear();
//         const currentMonth =
//           new Date().getMonth() + 1 >= 10
//             ? `${new Date().getMonth() + 1}`
//             : `0${new Date().getMonth() + 1}`;
//         const currentDay =
//           new Date().getDate() >= 10
//             ? new Date().getDate()
//             : `0${new Date().getDate()}`;
//         const nseData = await this.getHistoricalQuotesFromNSE(
//           company.symbol,
//           {
//             // fromDate: `${currentDay}-${currentMonth}-${currentYear}`,
//             // toDate: `${currentDay}-${currentMonth}-${currentYear}`,
//             fromDate: `15-09-2023`,
//             toDate: `15-09-2023`,
//           },
//         );

//         const dailyQuote: CreateQuoteDto = {
//           symbol: nseData.data[0].CH_SYMBOL,
//           series: nseData.data[0].CH_SERIES,
//           open: nseData.data[0].CH_OPENING_PRICE,
//           high: nseData.data[0].CH_TRADE_HIGH_PRICE,
//           low: nseData.data[0].CH_TRADE_LOW_PRICE,
//           close: nseData.data[0].CH_CLOSING_PRICE,
//           lastTradedPrice: nseData.data[0].CH_LAST_TRADED_PRICE,
//           previousClosePrice: nseData.data[0].CH_PREVIOUS_CLS_PRICE,
//           fiftyTwoWeekHighPrice: nseData.data[0].CH_52WEEK_HIGH_PRICE,
//           fiftyTwoWeekLowPrice: nseData.data[0].CH_52WEEK_LOW_PRICE,
//           totalTradeQuantity: nseData.data[0].CH_TOT_TRADED_QTY,
//           totalTradeValue: nseData.data[0].CH_TOT_TRADED_VAL,
//           totalTrade: nseData.data[0].CH_TOTAL_TRADES,
//           deliveryQuantity: nseData.data[0].COP_DELIV_QTY,
//           deliveryPercentage: nseData.data[0].COP_DELIV_QTY,
//           vwap: nseData.data[0].VWAP,
//           timestamp: nseData.data[0].TIMESTAMP,
//         };
//         // Save the quote details inside the collection
//         await this.createQuote(dailyQuote);
//         syncedCompanies.push(company.symbol);
//         console.log(`${company.symbol} ohlc inserted`);

//         // break;
//       } catch (error) {
//         console.log(`Error: syncDailyQuotes: ${company.symbol}: `, error);
//         failedCompanies.push(company.symbol);
//         // break;
//       }

//       if (syncedCompanies.length % 100 == 0) {
//         console.log(`Sleeping for 2 mins===================================`);
//         await this.sleep(1000 * 60 * 2);
//       }
//     }

//     return { syncedCompanies, failedCompanies };
//   } catch (error) {
//     if (error.name === 'ValidationError') {
//       throw new BadRequestException(error.errors);
//     }

//     throw new ServiceUnavailableException();
//   }
// }

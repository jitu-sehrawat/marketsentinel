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
import { addDays, format, isSaturday, isSunday, toDate } from 'date-fns';

const monthMaps = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

const holidays = [
  '9/19/2023',
  '1/26/2023',
  '3/7/2023',
  '3/30/2023',
  '4/4/2023',
  '4/7/2023',
  '4/14/2023',
  '4/22/2023',
  '5/1/2023',
  '6/29/2023',
  '8/15/2023',
  '9/19/2023',
  '10/2/2023',
  '10/24/2023',
  '11/14/2023',
  '11/27/2023',
  '12/25/2023',
];

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
    const datef = toDate(new Date());
    if (
      isSaturday(datef) ||
      isSunday(datef) ||
      holidays.indexOf(datef.toLocaleDateString()) > -1
    ) {
      return `Market is closed today. ${holidays.indexOf(
        datef.toLocaleDateString(),
      )}`;
    }
    try {
      const syncedCompanies = [];
      const failedCompanies = [];
      // Get List of all companies
      const companies = await this.companyService.getAll();
      // const companies = await this.companyService.get('INFY');
      // Get nse daily data for the Company
      for (const company of companies) {
        try {
          const hasOHLC = await this.quoteModel.find({
            symbol: company.symbol,
            timestamp: {
              $gte: new Date(
                `${format(datef, 'EEE, dd LLL yyyy')} 00:00:00 GMT`,
              ),
              $lt: new Date(
                `${format(addDays(datef, 1), 'EEE, dd LLL yyyy')} 00:00:00 GMT`,
              ),
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
                ? new Date(
                    `${format(datef, 'EEE, dd LLL yyyy')} 00:00:00 GMT`,
                  ).toUTCString()
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

  async insertHistoricalJSONtoDB() {
    // I have alerady added historical data till 15th september. Now only daily trade data will be stored.
    // A new flow wil be made that will download data from nse for past1-2 week and then fill the gaps of daily quote sync
    return true;
    try {
      let jsons;
      const companies = await this.companyService.getAll();
      // const companies = await this.companyService.get('INFY');
      for (const company of companies) {
        const nseSymbol = this.nseService.sanitizeSymbol(company.symbol);
        jsons = await this.nseService.readHistoricalJSON(nseSymbol);

        let transformedOhlc = [];
        for (const json of jsons.data) {
          const day = json.timestamp.split('-')[0];
          const month = monthMaps[json.timestamp.split('-')[1]];
          const year = json.timestamp.split('-')[2];
          const datef = toDate(new Date(year, month, day));

          const ohlc = {
            ...json,
            symbol: nseSymbol,
            timestamp: new Date(
              `${format(datef, 'EEE, dd LLL yyyy')} 00:00:00 GMT`,
            ),
          };
          transformedOhlc.push(ohlc);

          if (transformedOhlc.length == 2500) {
            await this.quoteModel.insertMany(transformedOhlc);
            transformedOhlc = [];
          }
        }
        await this.quoteModel.insertMany(transformedOhlc);

        console.log(`ohlc inserted for ${nseSymbol}`);
      }

      return true;
    } catch (error) {
      console.log(`Error: insertHistoricalJSONtoDB:`, error);
      if (error.name === 'ValidationError') {
        throw new BadRequestException(error.errors);
      }

      throw new ServiceUnavailableException();
    }
  }

  async removedailyquotes() {
    try {
      const datef = toDate(new Date());
      const hasOHLC = await this.quoteModel.deleteMany({
        timestamp: {
          $gte: new Date(`${format(datef, 'EEE, dd LLL yyyy')} 00:00:00 GMT`),
          $lt: new Date(
            `${format(addDays(datef, 1), 'EEE, dd LLL yyyy')} 00:00:00 GMT`,
          ),
        },
      });

      return hasOHLC;
    } catch (error) {
      if (error.name === 'ValidationError') {
        throw new BadRequestException(error.errors);
      }

      throw new ServiceUnavailableException();
    }
  }
}

import { promises as fsPomise, existsSync } from 'fs';
import * as fsxtra from 'fs-extra';
import * as fs from 'fs';
import * as path from 'path';
import axios, { AxiosResponse } from 'axios';
import { toDate, getYear, lastDayOfMonth, addMonths } from 'date-fns';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { ICompanyNSE, IDeliveryDailyNSE } from './interface';

let HEADERS = {};
let HistoricalHEADERS = {};
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

@Injectable()
export class NSEService {
  constructor() {}

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  sanitizeSymbol(symbol) {
    if (flaggedSymbols.hasOwnProperty(symbol)) {
      return flaggedSymbols[symbol];
    }

    return symbol;
  }

  yearlyDateBuidler(listedDate) {
    const listingDate = toDate(new Date(listedDate));
    const listingYear = getYear(listingDate);
    const today = toDate(new Date());
    const curretYear = getYear(today);

    const dateObjs = [];
    for (let i = listingYear; i <= curretYear; i++) {
      const monthFirstDay = [
        new Date(i, 3, 1), // year, month, day
        // new Date(i, 4, 1),
        // new Date(i, 5, 1),
        // new Date(i, 6, 1),
        // new Date(i, 7, 1),
        // new Date(i, 8, 1),
        // new Date(i, 9, 1),
        // new Date(i, 10, 1),
        // new Date(i, 11, 1),
        // new Date(i + 1, 0, 1),
        // new Date(i + 1, 1, 1),
        // new Date(i + 1, 2, 1),
      ];
      for (const firstDay of monthFirstDay) {
        const fromDate = toDate(firstDay).toLocaleDateString('en-GB');
        const tODate = lastDayOfMonth(
          addMonths(firstDay, 11),
        ).toLocaleDateString('en-GB');

        if (new Date().getTime() > firstDay.getTime()) {
          dateObjs.push({
            fromDate: fromDate.replaceAll('/', '-'),
            toDate: tODate.replaceAll('/', '-'),
          });
        }
      }
    }
    return dateObjs;
  }

  async getHistoricalHeaders() {
    const response: AxiosResponse = await axios({
      method: 'GET',
      url: `https://www.nseindia.com/report-detail/eq_security`,
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
      'x-requested-with': 'XMLHttpRequest',
      cookie: cookie,
      Referer: 'https://www.nseindia.com/report-detail/eq_security',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    };

    HistoricalHEADERS = headers;
    return headers;
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

  // This contains the company trade info details, like delivery volumes
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

  // Historical Data[using a fromDate and toDate]
  // https://www.nseindia.com/api/historical/securityArchives?from=01-04-2021&to=31-03-2022&symbol=INFY&dataType=priceVolumeDeliverable&series=ALL&csv=true
  async nseHistoricalSecurityArchives(fromDate, toDate, symbol, series = 'EQ') {
    let headers = {};
    if (Object.keys(HistoricalHEADERS).length > 0) {
      headers = HistoricalHEADERS;
    } else {
      headers = await this.getHistoricalHeaders();
    }
    const nseSymbol = this.sanitizeSymbol(symbol);
    const config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `https://www.nseindia.com/api/historical/securityArchives?from=${fromDate}&to=${toDate}&symbol=${nseSymbol}&dataType=priceVolumeDeliverable&series=${series}&&csv=true`,
      headers: headers,
    };
    const response = await axios.request(config);

    return response;
  }

  // HISTOICAL DATA
  async getHistoricalCSVfromNSE(company) {
    try {
      const nseSymbol = this.sanitizeSymbol(company.symbol);
      const historicalDates = await this.yearlyDateBuidler(company.listingDate);
      if (await existsSync(`./src/csvs/${nseSymbol}`)) {
        console.log(`Skipping ${nseSymbol}`);
        return {
          error: false,
          data: null,
        };
      }

      for (const historicalDate of historicalDates) {
        const fromDate = historicalDate.fromDate;
        const toDate = historicalDate.toDate;

        // const config = {
        //   method: 'get',
        //   maxBodyLength: Infinity,
        //   // url: `https://www.nseindia.com/api/historical/securityArchives?from=01-04-2021&to=31-03-2022&symbol=INFY&dataType=priceVolumeDeliverable&series=ALL&csv=true`,
        //   url: `https://www.nseindia.com/api/historical/securityArchives?from=${fromDate}&to=${toDate}&symbol=${nseSymbol}&dataType=priceVolumeDeliverable&series=ALL&&csv=true`,
        //   headers: headers,
        // };
        const response = await this.nseHistoricalSecurityArchives(
          fromDate,
          toDate,
          nseSymbol,
        );

        // Saving the csv into a file
        const dir = `./src/csvs/${nseSymbol}`;
        await fsPomise.mkdir(dir, { recursive: true });
        console.log(
          `${company.symbol} listed on ${new Date(
            company.listingDate,
          ).toLocaleDateString()}, data from ${fromDate} to ${toDate}`,
        );
        fsPomise.writeFile(
          `${dir}/${fromDate}to${toDate}.csv`,
          response.data,
          'utf8',
        );
        // Saving the csv into a file
      }

      return {
        error: false,
        data: null,
      };
    } catch (error) {
      console.log(`Error: getHistoricalCSVfromNSE: `, error);
      return {
        error: true,
        data: null,
      };
    }
  }

  convertToNumber(data) {
    const stripStrings = data.replaceAll(',', '');

    if (isNaN(stripStrings)) {
      return 0;
    }

    return parseFloat(stripStrings);
  }

  async formatOhlc(combinedOhlc) {
    const formattedOhlc = [];
    for (const ohlc of combinedOhlc) {
      const record = {
        symbol: ohlc['Symbol  '],
        series: ohlc['Series  '],
        open: this.convertToNumber(ohlc['Open Price  ']),
        high: this.convertToNumber(ohlc['High Price  ']),
        low: this.convertToNumber(ohlc['Low Price  ']),
        close: this.convertToNumber(ohlc['Close Price  ']),
        lastTradedPrice: this.convertToNumber(ohlc['Last Price  ']),
        previousClosePrice: this.convertToNumber(ohlc['Prev Close  ']),
        fiftyTwoWeekHighPrice: 0,
        fiftyTwoWeekLowPrice: 0,
        totalTradeQuantity: this.convertToNumber(
          ohlc['Total Traded Quantity  '],
        ),
        totalTradeValue: this.convertToNumber(ohlc['Turnover ₹  ']),
        totalTrade: this.convertToNumber(ohlc['No. of Trades  ']),
        deliveryQuantity: this.convertToNumber(ohlc['Deliverable Qty  ']),
        deliveryPercentage: this.convertToNumber(
          ohlc['% Dly Qt to Traded Qty  '],
        ),
        vwap: 0,
        timestamp: ohlc['Date  '],
      };
      formattedOhlc.push(record);
    }

    return formattedOhlc;
  }

  async convetCSVtoJSON(filepath) {
    const result = [];
    return new Promise((resolve, reject) => {
      const fs = require('fs');
      const Papa = require('papaparse');
      const options = { header: true };

      fs.createReadStream(filepath)
        .pipe(Papa.parse(Papa.NODE_STREAM_INPUT, options))
        .on('data', (data) => {
          result.push(data);
        })
        .on('end', () => {
          resolve(result);
        })
        .on('error', (error) => {
          reject(Error);
        });
    });
  }

  async convertHistoricalCSVtoJSON() {
    try {
      const baseDir = path.resolve(process.cwd());
      const csvDir = `${baseDir}/src/csvs`;
      const jsonDir = `${baseDir}/src/jsons`;
      const symbols = await fs.readdirSync(csvDir);
      for (const symbol of symbols) {
        const yearlyOhlc = await fs.readdirSync(`${csvDir}/${symbol}`);
        const combinedOhlc = [];
        for (const eachYearOhlc of yearlyOhlc) {
          const data = await this.convetCSVtoJSON(
            `${csvDir}/${symbol}/${eachYearOhlc}`,
          );
          const formattedData = await this.formatOhlc(data);
          combinedOhlc.push(...formattedData);
        }
        console.log(`${symbol} combinedOhlc: `, ' ', combinedOhlc.length);
        fs.writeFileSync(
          `${jsonDir}/${symbol}.json`,
          JSON.stringify(combinedOhlc),
          { flag: 'w' },
        );
      }
    } catch (error) {
      console.log(`Error: convertS: `, error);
    }
  }

  async readHistoricalJSON(nseSymbol) {
    try {
      const baseDir = path.resolve(process.cwd());
      const jsonDir = `${baseDir}/src/jsons`;
      const symbols = await fs.readdirSync(jsonDir);
      const data = [];
      for (const symbol of symbols) {
        if (symbol.includes(nseSymbol)) {
          // const jsonData = await fs.readFileSync(`${jsonDir}/${symbol}`);

          const jsonData = await fsxtra.readJson(`${jsonDir}/${symbol}`);

          data.push(...jsonData);
        } else {
          continue;
        }
      }

      return {
        error: false,
        data: data,
      };
    } catch (error) {
      console.log(`Error: readHistoricalJSON: `, error);
      // throw new Error(`readHistoricalJSON: ${error}`);
      return {
        error: true,
        data: null,
      };
    }
  }

  async getNseHistoricalDataForOneQuater() {}
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

// fetch(
//   'https://www.nseindia.com/api/historical/securityArchives?from=25-09-2023&to=02-10-2023&symbol=TCS&dataType=priceVolumeDeliverable&series=ALL&csv=true',
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
//       'x-requested-with': 'XMLHttpRequest',
//       cookie:
//         'defaultLang=en; ak_bmsc=3A76F1672225C57D556C3A14DE4E19A8~000000000000000000000000000000~YAAQS3xBFwfmdNaKAQAAcBMd8BUVS61VP8w24MUpo7O74HbhH5AICtLpBurdO8E3wd71Fvbax6WFrduRixltByM6HcjjMpXgNvFX2EqZtof/su/MSN2MvtM8Ir3a4I8pxuHO35kg+knKGBPilolqfoU+8qmbVKMcrqnBazFy4zT4ktsPGHd3sa1bYxnaoudUHlN7e6RDtrv7u9iWo43RklSSwPZo0fqWYYS9y8alUNJXnrlb+7jI2tqdnTXjY6nhU5oSWRgBNje49kwYrrS2OJAONKhUvbKCwU0TygsPfRiOaV7QlV2Tm9Cn0cDbuIPYdsFgTPWSVZv9B3bKBwagqGz+Mr/t/reIW0tCNc/2JCWPbea7a6d+r1or7FTCMebvleXEjYVlOyfscRnc; nsit=1McBB7YhIp4v3fO5ON6sLpoH; nseappid=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhcGkubnNlIiwiYXVkIjoiYXBpLm5zZSIsImlhdCI6MTY5NjI0ODkwNCwiZXhwIjoxNjk2MjU2MTA0fQ.j5LcOK6r-iabQXqJzqit658mRDKSZ5uz4z1CeSusIS8; bm_mi=D0C819928CFC2C587F2FAB267C9614D6~YAAQUEo5FwToGdiKAQAAdTtQ8BW8y01FW/j+gVNGUi/878vpBw0yZDcX3eBW1FiSG6gLX+aVRQ/SyvLNyctu+Ieygp/tMdYWB1WvB02RLDlvOiNJMomIdZVoplWO/UBSHcY7OZbF+rb4YFW7IQtDYMgHHlOsIUS03lQwZ7vL5hKcMYagCjZZttag5IsJfTfNE+N4yh+h3S2YBD9Sgjq0rIE2WwcPVfBQgTW7YWkYuCT32xOYHCwddrLnl78BvGSSmAFFvwU+6nhizPK/trd1WpgZcnd2vuHRcsiMPWui7M29X32REnav4JcUd+ttj7H1fCSAQ+4PmTEQnM+lr8nrt9QrVfaqEb+AWQ==~1; bm_sv=09ABF2B23DC435DE3BF671E1D5E24144~YAAQPCEPF9J/Q9mKAQAAeypg8BXjekUzUjVNkc3+0jdLtxo7f4XCkKYGcsFer3QxKtOFcpUvTvGjZU2UrSccyRU5enA2O7cTd+1qq1Xyl4qC4jrwSQCe1LYZoR8XtWs0PTTUoWJza6R8nkCDL8OwUxLLphHHIsbiwVXtzD3Sx1oSfseTu4rVz/lDox5bshB2jtPqfoLboPI/iCo59SKBidLcZvRibJvvbXSZ/rOOCtvmZL1c5gzKf5XO0KYVH/Rv4acm~1',
//       Referer: 'https://www.nseindia.com/report-detail/eq_security',
//       'Referrer-Policy': 'strict-origin-when-cross-origin',
//     },
//     body: null,
//     method: 'GET',
//   },
// );

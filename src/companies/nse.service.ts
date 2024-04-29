import { promises as fsPomise, existsSync } from 'fs';
import * as fsxtra from 'fs-extra';
import * as fs from 'fs';
import * as path from 'path';
import axios, { AxiosResponse } from 'axios';
import { toDate, getYear, lastDayOfMonth, addMonths } from 'date-fns';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { ICompanyNSE, IDeliveryDailyNSE } from './interface';
import puppeteer from 'puppeteer';

let HEADERS = {};
let HistoricalHEADERS = {};
let HistoricalHEADERSCOUNTER = 1;
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

  async getPagePuppeteer() {
    const browser = await puppeteer.launch({ headless: false });
    // const browser = await puppeteer.launch();
    const page = await browser.newPage();
    return { browser, page };
  }

  async getHeadersgetPagePuppeteer(page, url) {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
    const headers = response.headers();
    return headers;
  }

  async getHistoricalHeaders() {
    console.log(`Getting historical headers`);
    const url = 'https://www.nseindia.com/report-detail/eq_security';
    const { browser, page } = await this.getPagePuppeteer();
    const responseHeaders = await this.getHeadersgetPagePuppeteer(page, url);
    const cleanCookie = responseHeaders['set-cookie']
      .replaceAll(' ', '')
      .replaceAll('\n', '')
      .replaceAll('HttpOnly', '')
      .replaceAll('SameSite=Lax', '');

    // const cookie = `${response.headers['set-cookie'].join(';')}`;
    const headers = {
      authority: 'www.nseindia.com',
      accept: '*/*',
      'accept-language': 'en-US,en;q=0.9',
      cookie: cleanCookie,
      // 'cookie': 'defaultLang=en; ak_bmsc=E84E8B941A2508F4C93976D88275A94D~000000000000000000000000000000~YAAQxCEPF01jb2WMAQAA2C6uoRZ14pcYFrUv1OajxPora3Lo65NnPg1W+1K2HYtluFODEsxS+JosGeYHu3GTN8keGzeLSWHaORP71xQH3RnATdplenUigADy2YDNddPpOHNN4qOf5JSZC5MW18ZYIl0zi7BtNteQQUqr0XNZJqC8/Xoa05+p7eWfZROYAvO9X7HGh7GKVQerEQUDgrdh6pEfrCcyORvf4EAqcAG+lYu662osTo0E7WLLbRNwXEuqH48IknqwMd7Z/KVv+Yw/8R64XmX2BKkIgrDvwnXSQLm/nr+2cB8uPB+QT69pFsFHcrAUBPh0olT9FAzaLJi5f5WZC3re5B5fGMIeUPLhB+P3cMIBR6cm3zJ2HL7G7tGsunLcCS8q/HLScG3w; nsit=zHFz2ISTJ6bltQNM_KbeImr4; nseappid=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhcGkubnNlIiwiYXVkIjoiYXBpLm5zZSIsImlhdCI6MTcwMzUxOTYwMiwiZXhwIjoxNzAzNTI2ODAyfQ.JQVcqSDTt9DYJ-_lOq4dW2MQ_6mCm8y1n0MLSgdgIMQ; AKA_A2=A; bm_mi=6409E96D438D98927FD6ED57A5C9F8A5~YAAQxCEPF3tkb2WMAQAA/UeuoRbx2plfHzTH0tOeSpyyBe8INDsJRciYTIefcYYDNoHKrHN016hQTB3ccAd3fskpEM7IGORDbIN1OHyzoellyZJW//6CxGC95lcoKHobLdJyo7aDFAtsyGMUOTlJGGQ4rgvuiL+z0H+bI94DTjuOH2xBlYEAWKo/839axQRnX68TcLan3G7mcunkYi8usNxxlPZQllWdLHe26B6xBgY0CtGLzQYGwu6y6zlYZ1b1xUXTcIvc3IbaTPsTDN+vWQrwIf/FYbTuLT1cC0ndwoqvQSD2r0nUimwyEpwyI+Z9eu2hPaTgW5xpJwg2JM9C8K8FerNxYA7bSg==~1; bm_sv=D4E1E1E96DEFF14D79ACF71050880531~YAAQxCEPF3Job2WMAQAAqJCuoRbpY1H9spt12tL+Z+IdZkFer6E+0EWwfc5yDpHIO0vN6vRk9V6q2mnbAXaBgJZkZxfE/mrp6EyULuHohl5IFONl1VjE4+GJG3y5E+J5tThZknxHQ3GtQvFZ3B6jk/SL2CxixRoPycn4Zk6MjC8HEhWjSV2G6Z2GHiBJpXuM/aKNdrADr8tdWmrdSj7/QYYYG/whvALHHK4fqOgxeY2UsiNGrOQZuBILcyuxiTn5XP0=~1',
      dnt: '1',
      referer: 'https://www.nseindia.com/report-detail/eq_security',
      'sec-ch-ua':
        '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Linux"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'user-agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'x-requested-with': 'XMLHttpRequest',
    };

    browser.close();
    HistoricalHEADERS = headers;
    return headers;
  }

  async getHeaders() {
    console.log(`Getting daily sync headers`);
    const url = 'https://www.nseindia.com/get-quotes/equity?symbol=INFY';
    const { browser, page } = await this.getPagePuppeteer();
    const responseHeaders = await this.getHeadersgetPagePuppeteer(page, url);
    const cleanCookie = responseHeaders['set-cookie']
      .replaceAll(' ', '')
      .replaceAll('\n', '')
      .replaceAll('HttpOnly', '')
      .replaceAll('SameSite=Lax', '');

    const headers = {
      authority: 'www.nseindia.com',
      accept: '*/*',
      'accept-language': 'en-US,en;q=0.9',
      cookie: cleanCookie,
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

    HEADERS = headers;
    browser.close();
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
  async nseHistoricalSecurityArchives(
    fromDate,
    toDate,
    symbol,
    series = 'ALL',
  ) {
    let headers = {};
    console.log(
      `${HistoricalHEADERSCOUNTER} == HistoricalHEADERSCOUNTER % 20 == ${
        HistoricalHEADERSCOUNTER % 20
      }`,
    );
    if (
      Object.keys(HistoricalHEADERS).length > 0 &&
      HistoricalHEADERSCOUNTER % 20 != 0
    ) {
      headers = HistoricalHEADERS;
    } else {
      headers = await this.getHistoricalHeaders();
    }

    HistoricalHEADERSCOUNTER++;
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

// fetch(
//   'https://www.nseindia.com/api/historical/securityArchives?from=25-11-2023&to=25-12-2023&symbol=INFY&dataType=priceVolumeDeliverable&series=ALL&csv=true',
//   {
//     headers: {
//       accept: '*/*',
//       'accept-language': 'en-US,en;q=0.9',
//       'sec-ch-ua':
//         '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
//       'sec-ch-ua-mobile': '?0',
//       'sec-ch-ua-platform': '"Linux"',
//       'sec-fetch-dest': 'empty',
//       'sec-fetch-mode': 'cors',
//       'sec-fetch-site': 'same-origin',
//       'x-requested-with': 'XMLHttpRequest',
//       cookie:
//         'nsit=DqFWn3JOI-WmUP7nOoY12TqQ; AKA_A2=A; defaultLang=en; bm_mi=115E72A58DDFEEB8A86334C165E666B1~YAAQxCEPF60jRWWMAQAAUBQFnRaBdFIKsVwTC7c1MnOkTScOqfJ4SFlqFPicSdCO+v3mQ+432uJXdalsc83Bi8M9crlj+0C8Mdz4Paj9z/yDAO6h7IoZYLgAMnLCKxkSEFS88iNXMYbuf05o1cIerE5zIj3WFho4nKFn+HlvSUq1PnYuLxgBd8d+NWkAfGh7kc3Gm3jipv7iKbTbMNoONGNx3G9AFVXJ1Iv5rhIFW7SOCvDXD8wPwQSQUvlDoSVzoV5rpjrwS3n3ugisLQTjI4XJfWXrS0g0+DipuJjT3Xj0IAAlv3AWAo+o46kOqDwWz/3fDOXvWy2gVWcgsKrYXR7wGDCj+h1HmQ==~1; bm_sv=FA80BD90EC69377CD92F4D40B11367B5~YAAQxCEPF10mRWWMAQAAiVEFnRbwo/o7qNuyMtAZfokkXeZdJ/Rw4sjA7xuw1Y9wpGqBoEtJaOXCrQ2g77OofGEw6mFMb2SDJCZSZwLBms8f1zTCGrUK20vm8s778MW1dMIdGE6tAqMZsQ7ch71Go8WROjzdcKbiBRpXKevY+EhMcFA1SNcPydyh+h9sblP/Unw3UUhzoP9ZK+/Mn5aOx0iEC3zi95RWlzj+cenXtfdhcMmTCUbgoOqp7jfPvc7GIgT2~1; ak_bmsc=52914B147DB63D5E3882C89FFDA359D5~000000000000000000000000000000~YAAQxCEPF7coRWWMAQAAQYwFnRajd4LTItdTBuMooBHGUmCbEKsC6fcSY6MJiUEFuadpxkfVeWH4t4qXF/jwMcQFwJ3waAqT7SVN8InHiWbbAo8zw/VPqOzMTWj95L9RvGlxwSJZa3xv81txpWI5payKwJIMn0A1zTyjxbUzPpmhrPz12Xc2NgU5unrxI+5kBYUWkF/oBxIm3Sq3tFKCloM+jEk5X682gq8SYNnq8PwNs8CsOcsp9tr5r6Q8ubTLhKzSnod/bYaDrnUnwV86rmCHBeKLjzWOaV3OKHhDdfefMjIYJFoUrCjfMip2jFIgzgG/OyOho6qA6Qpg5fk7YOnT4jFEDaftZr5EVv0YsncbD0yThfyxNe7CyxYHKFb/GYDqSxWat3t9XYpxLchO7D3FFcFCjvYqxyMZgAv7WDPPwUoopnCtZ6COwyqhtxjPrTWJBMPwPS924A==; nseappid=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhcGkubnNlIiwiYXVkIjoiYXBpLm5zZSIsImlhdCI6MTcwMzQ0MzE0OCwiZXhwIjoxNzAzNDUwMzQ4fQ.L3hfsn_uWqU1hizitvMXwroMDHNTFQuR6lDWLCO6Rqk',
//       Referer: 'https://www.nseindia.com/report-detail/eq_security',
//       'Referrer-Policy': 'strict-origin-when-cross-origin',
//     },
//     body: null,
//     method: 'GET',
//   },
// );

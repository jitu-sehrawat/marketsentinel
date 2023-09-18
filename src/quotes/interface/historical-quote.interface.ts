export interface IHistoricalQuote {
  data: Daily[];
  meta: Meta;
}

export interface Daily {
  _id: string;
  CH_SYMBOL: string;
  CH_SERIES: string;
  CH_MARKET_TYPE: string;
  CH_TRADE_HIGH_PRICE: number;
  CH_TRADE_LOW_PRICE: number;
  CH_OPENING_PRICE: number;
  CH_CLOSING_PRICE: number;
  CH_LAST_TRADED_PRICE: number;
  CH_PREVIOUS_CLS_PRICE: number;
  CH_TOT_TRADED_QTY: number;
  CH_TOT_TRADED_VAL: number;
  CH_52WEEK_HIGH_PRICE: number;
  CH_52WEEK_LOW_PRICE: number;
  CH_TOTAL_TRADES: number;
  CH_ISIN: string;
  CH_TIMESTAMP: string;
  TIMESTAMP: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  COP_DELIV_QTY: number;
  COP_DELIV_PERC: number;
  VWAP: number;
  mTIMESTAMP: string;
}

export interface Meta {
  series: string;
  fromDate: string;
  toDate: string;
  symbols: string[];
}

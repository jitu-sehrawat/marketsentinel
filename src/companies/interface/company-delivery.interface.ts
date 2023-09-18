export interface IDeliveryDailyNSE {
  noBlockDeals: boolean;
  bulkBlockDeals: BulkBlockDeal[];
  marketDeptOrderBook: MarketDeptOrderBook;
  securityWiseDP: SecurityWiseDp;
}

export interface BulkBlockDeal {
  name: string;
}

export interface MarketDeptOrderBook {
  totalBuyQuantity: number;
  totalSellQuantity: number;
  bid: Bid[];
  ask: Ask[];
  tradeInfo: TradeInfo;
  valueAtRisk: ValueAtRisk;
}

export interface Bid {
  price: number;
  quantity: number;
}

export interface Ask {
  price: number;
  quantity: number;
}

export interface TradeInfo {
  totalTradedVolume: number;
  totalTradedValue: number;
  totalMarketCap: number;
  ffmc: number;
  impactCost: number;
  cmDailyVolatility: string;
  cmAnnualVolatility: string;
}

export interface ValueAtRisk {
  securityVar: number;
  indexVar: number;
  varMargin: number;
  extremeLossMargin: number;
  adhocMargin: number;
  applicableMargin: number;
}

export interface SecurityWiseDp {
  quantityTraded: number;
  deliveryQuantity: number;
  deliveryToTradedQuantity: number;
  seriesRemarks: any;
  secWiseDelPosDate: string;
}

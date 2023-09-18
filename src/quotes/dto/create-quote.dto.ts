import { IsDateString, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateQuoteDto {
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @IsString()
  series: string;

  @IsNumber()
  @IsNotEmpty()
  open: number;

  @IsNumber()
  @IsNotEmpty()
  high: number;

  @IsNumber()
  @IsNotEmpty()
  low: number;

  @IsNumber()
  @IsNotEmpty()
  close: number;

  @IsNumber()
  @IsNotEmpty()
  lastTradedPrice: number;

  @IsNumber()
  @IsNotEmpty()
  previousClosePrice: number;

  @IsNumber()
  @IsNotEmpty()
  fiftyTwoWeekHighPrice: number;

  @IsNumber()
  @IsNotEmpty()
  fiftyTwoWeekLowPrice: number;

  @IsNumber()
  @IsNotEmpty()
  totalTradeQuantity: number;

  @IsNumber()
  @IsNotEmpty()
  totalTradeValue: number;

  @IsNumber()
  @IsNotEmpty()
  totalTrade: number;

  @IsNumber()
  @IsNotEmpty()
  deliveryQuantity: number;

  @IsNumber()
  @IsNotEmpty()
  deliveryPercentage: number;

  @IsNumber()
  vwap: number;

  @IsDateString()
  @IsNotEmpty()
  timestamp: string;
}

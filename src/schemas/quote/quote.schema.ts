import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  Date,
  Document,
  HydratedDocument,
  Model,
  Query,
  SchemaTypes,
} from 'mongoose';

@Schema({
  timestamps: true,
})
export class Quote {
  // @Prop({ type: Types.ObjectId, ref: USER_MODEL, required: true })
  // employer: Types.ObjectId | User;

  @Prop({ required: true })
  symbol: string;

  @Prop({ default: null })
  series: string;

  @Prop({ default: null })
  open: number;

  @Prop({ default: null })
  high: number;

  @Prop({ default: null })
  low: number;

  @Prop({ default: null })
  close: number;

  @Prop({ default: null })
  lastTradedPrice: number;

  @Prop({ default: null })
  previousClosePrice: number;

  @Prop({ default: null })
  fiftyTwoWeekHighPrice: number;

  @Prop({ default: null })
  fiftyTwoWeekLowPrice: number;

  @Prop({ default: null })
  totalTradeQuantity: number;

  @Prop({ default: null })
  totalTradeValue: number;

  @Prop({ default: null })
  totalTrade: number;

  @Prop({ default: null })
  deliveryQuantity: number;

  @Prop({ default: null })
  deliveryPercentage: number;

  @Prop({ default: null })
  vwap: number;

  @Prop({ default: null, type: SchemaTypes.Date })
  timestamp: Date;
}

export type QuoteDocument = Quote & Document;

export const QuoteSchema = SchemaFactory.createForClass(Quote);

export const QUOTE_MODEL = Quote.name; // Job

export type QuoteModelQuery = Query<
  any,
  HydratedDocument<Quote>, // UserDocument
  IQuoteQueryHelpers
> &
  IQuoteQueryHelpers; // chaining

export interface IQuoteQueryHelpers {
  // byName(this: UserModelQuery, name: string): UserModelQuery;
}

export interface IQuoteModel extends Model<QuoteDocument, IQuoteQueryHelpers> {
  // findByEmailAndPassword: (
  //   email: string,
  //   password: string,
  // ) => Promise<CompanyDocument | undefined>;
}

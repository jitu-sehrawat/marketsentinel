import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  Date,
  Document,
  HydratedDocument,
  Model,
  Query,
  SchemaTypes,
} from 'mongoose';
import { IndustryInfo, IndustryInfoSchema } from './industryinfo.schema';

@Schema({
  timestamps: true,
})
export class Company {
  // @Prop({ type: Types.ObjectId, ref: USER_MODEL, required: true })
  // employer: Types.ObjectId | User;

  @Prop({ default: null })
  companyName: string;

  @Prop({ required: true, unique: true })
  symbol: string;

  @Prop({ default: null })
  isin: string;

  @Prop({ default: null })
  series: string;

  @Prop({ default: null, type: SchemaTypes.Date })
  listingDate: Date;

  @Prop({ default: null })
  symbolPe: number;

  @Prop({ default: null })
  sectorPe: number;

  @Prop({ default: null })
  sectorInd: string;

  @Prop({ default: null })
  issuedSize: number;

  @Prop({ default: null })
  faceValue: number;

  @Prop({ default: null })
  sectorIndustry: string;

  @Prop({ type: IndustryInfoSchema })
  industryInfo: IndustryInfo;

  // @Prop({
  //   type: String,
  //   enum: Object.keys(JOB_TYPE),
  //   required: true,
  // })
  // type: JOB_TYPE;

  // @Prop({ type: AddressSchema, required: true })
  // location: Address;
}

export type CompanyDocument = Company & Document;

export const CompanySchema = SchemaFactory.createForClass(Company);

export const COMPANY_MODEL = Company.name; // Job

export type CompanyModelQuery = Query<
  any,
  HydratedDocument<Company>, // UserDocument
  ICompanyQueryHelpers
> &
  ICompanyQueryHelpers; // chaining

export interface ICompanyQueryHelpers {
  // byName(this: UserModelQuery, name: string): UserModelQuery;
}

export interface ICompanyModel
  extends Model<CompanyDocument, ICompanyQueryHelpers> {
  // findByEmailAndPassword: (
  //   email: string,
  //   password: string,
  // ) => Promise<CompanyDocument | undefined>;
}

// Middlewares, Hooks
// eslint-disable-next-line @typescript-eslint/ban-types
function populateMiddleware(next: Function) {
  // this.populate({ path: 'employer', select: { name: 1 } });
  this.populate();
  next();
}

CompanySchema.pre('findOne', populateMiddleware);

CompanySchema.pre('find', populateMiddleware);

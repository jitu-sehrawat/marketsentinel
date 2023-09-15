import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({
  timestamps: true,
})
export class Address {
  @Prop({ required: true })
  address1: string;

  @Prop()
  address2: string;

  @Prop()
  sta?: string;

  @Prop()
  state?: string;

  @Prop({ required: true })
  country?: string;

  @Prop()
  zipcode?: string;
}

const schema = SchemaFactory.createForClass(Address);

export const AddressSchema = schema;

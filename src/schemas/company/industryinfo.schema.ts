import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({
  timestamps: true,
})
export class IndustryInfo {
  @Prop({ default: null })
  macro: string;

  @Prop({ default: null })
  sector: string;

  @Prop({ default: null })
  industry: string;

  @Prop({ default: null })
  basicIndustry: string;
}

const schema = SchemaFactory.createForClass(IndustryInfo);

export const IndustryInfoSchema = schema;

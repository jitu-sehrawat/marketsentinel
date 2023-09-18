import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { USER_MODEL, UserSchema } from './user/user.schema';
import { JOB_MODEL, JobSchema } from './job/job.schema';
import { COMPANY_MODEL, CompanySchema } from './company';
import { QUOTE_MODEL, QuoteSchema } from './quote';

const MODELS = [
  { name: USER_MODEL, schema: UserSchema },
  { name: JOB_MODEL, schema: JobSchema },
  { name: COMPANY_MODEL, schema: CompanySchema },
  { name: QUOTE_MODEL, schema: QuoteSchema },
];

@Global()
@Module({
  imports: [MongooseModule.forFeature(MODELS)],
  exports: [MongooseModule],
})
export class MongooseModelsModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MongooseConfigService } from './mongoose-config.service';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useClass: MongooseConfigService,
    }),
    // MongooseModule.forRoot(
    //   'mongodb://trader:NoobTrader123@localhost:27017/nestjs?authMechanism=DEFAULT',
    // ),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}

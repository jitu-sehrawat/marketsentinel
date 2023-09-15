import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MongooseModuleOptions,
  MongooseOptionsFactory,
} from '@nestjs/mongoose';

@Injectable()
export class MongooseConfigService implements MongooseOptionsFactory {
  constructor(private readonly config: ConfigService) {}

  createMongooseOptions():
    | MongooseModuleOptions
    | Promise<MongooseModuleOptions> {
    const username = this.config.get('DATABASE_USER');
    const password = this.config.get('DATABASE_PASSWORD');
    let host = this.config.get('DATABASE_HOST');
    const port = this.config.get('DATABASE_PORT');
    const db = this.config.get('DATABASE_NAME');

    const envType = this.config.get('NODE_ENV');

    if (envType == 'LOCAL') {
      host = 'localhost';
    }

    const uri = `mongodb://${username}:${password}@${host}:${port}/${db}?authMechanism=DEFAULT&authSource=admin`;
    console.log(uri);

    return { uri };
  }
}

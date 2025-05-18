import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import * as fs from 'fs';

async function main() {
  if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
  }
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService>(ConfigService);
  const port = config.get<number>('PORT') || 3000;
  const host = config.get<string>('HOST') || '0.0.0.0';
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.setGlobalPrefix(`api/${config.get<string>('API_VERSION')}`);
  app.enableCors({
    origin: '*',
  });
  await app.listen(port, host);
}
main();

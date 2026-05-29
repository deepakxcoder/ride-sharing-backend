import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as bodyParser from 'body-parser';
const express = require('express')
import dotenv from 'dotenv'

dotenv.config()


async function bootstrap() {
 const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
);
 app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  });

  app.use(
  '/payments/webhook',
  express.raw({ type: 'application/json' }),
);

  app.enableCors()
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

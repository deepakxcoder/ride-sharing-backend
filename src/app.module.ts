import { ConfigurableModuleBuilder, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RedisModule } from './redis/redis.module';
import { MailModule } from './mail/mail.module';
import { ConfigModule } from '@nestjs/config';
import { DriverModule } from './driver/driver.module';
import { AdminModule } from './admin/admin.module';
import { RoutesModule } from './routes/routes.module';
import { PricingModule } from './pricing/pricing.module';
import { RidesModule } from './rides/rides.module';
import { RealtimeGateway } from './realtime/realtime.gateway';
import { RealtimeModule } from './realtime/realtime.module';
import { PaymentsModule } from './payments/payments.module';
import dotenv from 'dotenv';
dotenv.config();


@Module({
  imports: [
    // Connect to local MongoDB
    MongooseModule.forRoot(process.env.MONGO_URI as string),
    AuthModule,
    UsersModule,
    RedisModule,
    MailModule,
    ConfigModule.forRoot({
      isGlobal:true,
    }),
    DriverModule,
    AdminModule,
    RoutesModule,
    PricingModule,
    RidesModule,
    RealtimeModule,
    PaymentsModule,
  ],
})
export class AppModule {}
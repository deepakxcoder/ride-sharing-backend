import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Ride, RideSchema } from '../rides/schemas/ride.schema';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.service';
import { DriverWallet, DriverWalletSchema } from '../driver/schemas/driver-wallet.schema';
import { RealtimeModule } from '../realtime/realtime.module';


@Module({
  imports: [
    MongooseModule.forFeature([{ name: Ride.name, schema: RideSchema },
        {name:DriverWallet.name, schema:DriverWalletSchema},
    ]),
    RealtimeModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, StripeService],
})
export class PaymentsModule {}
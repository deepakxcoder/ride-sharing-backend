import { Module } from '@nestjs/common';
import { RidesController } from './rides.controller';
import { RidesService } from './rides.service';
import { RoutesModule } from '../routes/routes.module';
import { PricingModule } from '../pricing/pricing.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Ride, RideSchema } from './schemas/ride.schema';
import { DriverProfile, DriverProfileSchema } from '../driver/schemas/driver-profile.schema';
import { DriverWallet, DriverWalletSchema } from '../driver/schemas/driver-wallet.schema';



@Module({
  imports:[RoutesModule,PricingModule,
    MongooseModule.forFeature([
      {name:Ride.name, schema:RideSchema},
      {name:DriverProfile.name, schema:DriverProfileSchema},
      {
        name:DriverWallet.name, schema:DriverWalletSchema
      }
    ]),
  ],
  controllers: [RidesController],
  providers: [RidesService,],
  exports:[RidesService,],
})
export class RidesModule {}

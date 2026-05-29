import { Module } from '@nestjs/common';
import { DriverController } from './driver.controller';
import { DriverService } from './driver.service';
import { MongooseModule } from '@nestjs/mongoose';
import { DriverProfile, DriverProfileSchema } from './schemas/driver-profile.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { UsersModule } from '../users/users.module';
import { Ride, RideSchema } from '../rides/schemas/ride.schema';
import { DriverWallet, DriverWalletSchema } from './schemas/driver-wallet.schema';

@Module({
  imports: [
    UsersModule, // 👈 IMPORT users instead of redefining User
    MongooseModule.forFeature([
      { name: DriverProfile.name, schema: DriverProfileSchema },
      {name:Ride.name, schema:RideSchema},
      {
        name:DriverWallet.name, schema:DriverWalletSchema
      }
    ]),
  ],
  controllers: [DriverController],
  providers: [DriverService,],
  exports: [
    MongooseModule, // exports DriverProfile model
  ],
})
export class DriverModule {}
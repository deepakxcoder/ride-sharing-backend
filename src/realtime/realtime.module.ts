import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { MongooseModule } from '@nestjs/mongoose';
import { DriverProfile, DriverProfileSchema } from '../driver/schemas/driver-profile.schema';
import { Ride, RideSchema } from '../rides/schemas/ride.schema';
import { RidesModule } from '../rides/rides.module';

@Module({
  imports: [
    RidesModule,
    MongooseModule.forFeature([
      { name: DriverProfile.name, schema: DriverProfileSchema },
      { name: Ride.name, schema: RideSchema },
    ]),
  ],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}

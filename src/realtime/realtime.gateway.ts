import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { RidesService } from '../rides/rides.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DriverProfile, DriverStatus } from '../driver/schemas/driver-profile.schema';
import { Ride } from '../rides/schemas/ride.schema';
import { Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { RequestRideDto } from 'src/rides/dto/request-ride.dto';

@WebSocketGateway({
  cors: { origin: '*' },
})
@Injectable()
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private readonly ridesService: RidesService,
    @InjectModel(DriverProfile.name)
    private readonly driverModel: Model<DriverProfile>,
    @InjectModel(Ride.name)
    private readonly rideModel: Model<Ride>,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  @WebSocketServer()
  server: Server;

  /* ============================================================
     CONNECTION HANDLING
  ============================================================ */

  handleConnection(client: Socket) {
    console.log('Socket connected:', client.id);
  }

  async handleDisconnect(client: Socket) {
    console.log('Socket disconnected:', client.id);

    // Optional: remove driver from Redis instantly
    const driverId = client.data?.driverId;

    if (driverId) {
      await this.redis.zrem('drivers:available', driverId);
      console.log('Removed driver from Redis:', driverId);
    }
  }

  /* ============================================================
     ROOM JOINING
  ============================================================ */

  @SubscribeMessage('driver:join')
  handleDriverJoin(
    @MessageBody() data: { driverId: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log('Driver joined room:', `driver_${data.driverId}`);

    client.join(`driver_${data.driverId}`);

    // Save driverId to socket for disconnect cleanup
    client.data.driverId = data.driverId;
  }

  @SubscribeMessage('rider:join')
  handleRiderJoin(
    @MessageBody() data: { riderId: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log('Rider joined room:', `rider_${data.riderId}`);
    client.join(`rider_${data.riderId}`);
  }

  /* ============================================================
     DRIVER LOCATION STREAM
  ============================================================ */

  @SubscribeMessage('driver:location')
  async handleDriverLocation(
    @MessageBody()
    data: { userId: string; lat: number; lng: number },
  ) {
    const { userId, lat, lng } = data;

    const driver = await this.driverModel.findOne({
      userId: new Types.ObjectId(userId),
      isOnline: true,
      status: DriverStatus.APPROVED,
    });

    if (!driver) return;
    

    // Update MongoDB
    driver.currentLocation = {
      type: 'Point',
      coordinates: [lng, lat],
    };

    await driver.save();

    // Update Redis Geo
    await this.redis.geoadd(
      'drivers:available',
      lng,
      lat,
      driver._id.toString(),
    );

    // If driver has active ride → send live location to rider
    const activeRide = await this.rideModel.findOne({
      driverId: driver._id,
      status: { $in: ['ACCEPTED', 'ARRIVED' ,'STARTED'] },
    });

    if (activeRide) {
      this.server
        .to(`rider_${activeRide.riderId}`)
        .emit('driver:location', { lat, lng });
    }
  }

  /* ============================================================
     RIDE REQUEST
  ============================================================ */

  @SubscribeMessage('ride:request')
  async handleRideRequest(@MessageBody() dto: RequestRideDto & { riderId: string }) {
    const { ride, nearbyDrivers } =
      await this.ridesService.requestRide(dto, dto.riderId);

    this.dispatchRideToDrivers(ride, nearbyDrivers);
  }

  /* ============================================================
     RIDE ACCEPT
  ============================================================ */

  @SubscribeMessage('ride:accept')
  async handleAccept(@MessageBody() data: any) {
    const result = await this.ridesService.acceptRide(
      data.rideId,
      data.driverId,
    );

    if (result.status === 'success') {
      // Notify rider
      this.server
        .to(`rider_${result.riderId}`)
        .emit('ride:confirmed', result);

      // Notify driver
      this.server
        .to(`driver_${result.driverId}`)
        .emit('ride:accepted', result);

      // Broadcast ride taken
      this.server.emit('ride:taken', {
        rideId: result.rideId,
      });
    }
  }

  /* ============================================================
     DISPATCH FUNCTION
  ============================================================ */

 private async dispatchRideToDrivers(ride: any, nearbyDrivers: any[]) {
  for (const [driverId, distanceKm] of nearbyDrivers.slice(0, 3)) {

    const etaToPickup = Math.ceil(distanceKm * 3);

    this.server.to(`driver_${driverId}`).emit('new_ride_request', {
      rideId: ride._id,
      price: ride.riderPrice,
      rideType: ride.rideType,

      rider: {
        name: ride.riderName,
        rating: ride.riderRating || 4.5,
        isVerified: true,
      },

      pickup: {
        address: ride.pickupAddress,
        lat: ride.pickupLat,
        lng: ride.pickupLng,
        etaMinutes: etaToPickup,
        distanceKm,
      },

      dropoff: {   // ✅ ADD THIS
        address: ride.dropoffAddress,
        lat: ride.dropLat,
        lng: ride.dropLng,
      },

      trip: {
        distanceKm: ride.distanceKm,
        durationMinutes: ride.durationMinutes,
      },
    });
  }

}
    /* ============================================================
     Driver:Status
  ============================================================ */
  @SubscribeMessage('ride:arrived')
async handleArrived(@MessageBody() data: any) {
  const ride = await this.ridesService.markArrived(
    data.rideId,
    data.driverId,
  );

  this.server
    .to(`rider_${ride.riderId}`)
    .emit('ride:status', {
      status: "ARRIVED",
    });

    // ✅ ALSO notify driver
  this.server
    .to(`driver_${ride.driverId}`)
    .emit('ride:status', {
      status: "ARRIVED",
    });
}


@SubscribeMessage('ride:join')
handleRideJoin(
  @MessageBody() data: { rideId: string },
  @ConnectedSocket() client: Socket,
) {
  client.join(`ride_${data.rideId}`);
}

@SubscribeMessage('ride:start')
async handleStart(@MessageBody() data: any) {
  const ride = await this.ridesService.startRide(
    data.rideId,
    data.otp,
  );  

  // notify rider
  this.server
    .to(`rider_${ride.riderId}`)
    .emit('ride:status', {
      status: "STARTED",
    });

  // notify driver (optional but clean)
  this.server
    .to(`driver_${ride.driverId}`)
    .emit('ride:status', {
      status: "STARTED",
    });
}

// @SubscribeMessage('ride:complete')
// async handleComplete(@MessageBody() data: any) {

//   const ride =
//     await this.ridesService.completeRide(
//       data.rideId,
//     );

//   this.server
//     .to(`rider_${ride.riderId}`)
//     .emit('ride:completed', ride);

//   this.server
//     .to(`driver_${ride.driverId}`)
//     .emit('ride:completed', ride);
// }

@SubscribeMessage('ride:complete')
async handleComplete(@MessageBody() data: any) {

  const result = await this.ridesService.completeRide(
    data.rideId,
    data.paymentMode,
  );

  if (result.paymentRequired === false) {

    this.server
      .to(`driver_${result.ride.driverId}`)
      .emit('ride:payment_success', result.ride);
      

    this.server
      .to(`rider_${result.ride.riderId}`)
      .emit('ride:payment_success', result.ride);

  } else {
    console.log("Emitting awaiting_payment to:", `rider_${result.ride.riderId}`);

    this.server
      .to(`rider_${result.ride.riderId}`)
      .emit('ride:awaiting_payment', result.ride);

  }
}
async handleConfirmPayment(@MessageBody() data: any) {

  const ride = await this.ridesService.confirmPayment(
    data.rideId,
    data.method,
  );

  this.server
    .to(`driver_${ride.driverId}`)
    .emit('ride:payment_success', ride);

  this.server
    .to(`rider_${ride.riderId}`)
    .emit('ride:payment_success', ride);
}

}

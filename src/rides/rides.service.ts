import { Inject, Injectable } from '@nestjs/common';
import { RideType } from '../common/enums/ride-type.enum';
import { PricingService } from '../pricing/pricing.service';
import { RoutesService } from '../routes/routes.service';
import Redis from 'ioredis';
import { InjectModel } from '@nestjs/mongoose';
import { Ride, RideStatus } from './schemas/ride.schema';
import { Model, Types } from 'mongoose';
import { RequestRideDto } from './dto/request-ride.dto';

import { DriverProfile } from '../driver/schemas/driver-profile.schema';
import { DriverWallet } from '../driver/schemas/driver-wallet.schema';


@Injectable()
export class RidesService {
  constructor(
    private routesService: RoutesService,
    private pricingService: PricingService,
    @InjectModel(Ride.name) private rideModel:Model<Ride>,
    @InjectModel(DriverProfile.name) private driverModel:Model<DriverProfile>,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    @InjectModel(DriverWallet.name)
private walletModel: Model<DriverWallet>,
  ) {}
  async estimate(pickup, dropoff) {
    const route = await this.routesService.getRoute(pickup, dropoff);

    const distanceKm = route.distanceMeters / 1000;
    const durationMin = route.durationSeconds / 60;

    return {
      distanceKm: Number(distanceKm.toFixed(2)),
      durationMin: Math.ceil(durationMin),
      geometry: route.geometry,

      options: [
        {
          type: RideType.BIKE,
          price: await this.pricingService.calculate(
            RideType.BIKE,
            route.distanceMeters,
            route.durationSeconds,
          ),
          eta: Math.ceil(durationMin),
        },
        {
          type: RideType.CAB,
          price: await this.pricingService.calculate(
            RideType.CAB,
            route.distanceMeters,
            route.durationSeconds,
          ),
          eta: Math.ceil(durationMin + 2),
        },
        {
          type: RideType.XL,
          price: await this.pricingService.calculate(
            RideType.XL,
            route.distanceMeters,
            route.durationSeconds,
          ),
          eta: Math.ceil(durationMin + 4),
        },
      ],
    };
  }

  async findNearestDrivers(lat: number, lng: number): Promise<[string,string][]> {
    console.log("🔍 Searching from:", {
    lng,
    lat
  });
    const drivers = await this.redis.georadius(
  'drivers:available',
  lng,
  lat,
  200,
  'km',
  'WITHDIST'
);


    console.log(drivers);
    return drivers as [string, string][];
  }

async requestRide(dto: RequestRideDto, riderId: string) {
    const route = await this.routesService.getRoute(
      dto.pickup,
      dto.dropoff,
    );



    const riderPrice = await this.pricingService.calculate(
      dto.rideType,
      route.distanceMeters,
      route.durationSeconds,
    );

    const commissionPercent = 0.20;
    const driverEarning = Math.round(
      riderPrice * (1 - commissionPercent),
    );

   const ride = await this.rideModel.create({
  riderId,
  pickupLat: dto.pickup.lat,
  pickupLng: dto.pickup.lng,
  pickupAddress: dto.pickup.address,      // ✅ ADD

  dropLat: dto.dropoff.lat,
  dropLng: dto.dropoff.lng,
  dropoffAddress: dto.dropoff.address,    // ✅ ADD

  rideType: dto.rideType,
  riderPrice,
  driverEarning,
  status: RideStatus.SEARCHING,
});


    const nearbyDrivers = await this.findNearestDrivers(dto.pickup.lat,dto.pickup.lng);
    console.log("Nearby drivers from redis:", nearbyDrivers);


    return { ride, nearbyDrivers };
  }

  async acceptRide(rideId: string, driverId: string) {
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
  const ride = await this.rideModel.findOneAndUpdate(
    {
      _id: rideId,
      status: RideStatus.SEARCHING,
    },
    {
      status: RideStatus.ACCEPTED,
      driverId: new Types.ObjectId(driverId),
      otp:otp
    },
    { new: true }
  );

  if (!ride) {
    return { status: 'already_taken' };
  }

  // Remove driver from available pool
  await this.redis.zrem('drivers:available', driverId);

  return {
    status: 'success',
    riderId: ride.riderId,
    rideId: ride._id,
    driverId,
    otp:ride.otp,
  };
}

async updateDriverLocation(driverId: string, lat: number, lng: number) {
  await this.redis.geoadd(
    'drivers:available',
    lng,
    lat,
    driverId,
  );

  await this.redis.set(
    `driver:lastActive:${driverId}`,
    Date.now(),
    'EX',
    20,
  );
}


async getRideById(id: string) {
  return this.rideModel
    .findById(id)
    .populate('driverId', 'name phone vehicleNumber') // ✅ Populate driver
    .exec();
}

 async markArrived(id: string, driverId: string) {
  const ride = await this.rideModel.findOne({
    _id: id,
    driverId: new Types.ObjectId(driverId),
    status: RideStatus.ACCEPTED,
  });

  if (!ride) {
    throw new Error('Ride not in ACCEPTED state');
  }

  const driver = await this.driverModel.findById(driverId);

  if (!driver?.currentLocation) {
    throw new Error('Driver location missing');
  }

  const [lng, lat] = driver.currentLocation.coordinates;

  const distance = this.calculateDistance(
    lat,
    lng,
    ride.pickupLat,
    ride.pickupLng
  );

  if (distance > 100) {
    throw new Error('Driver too far from pickup');
  }

  ride.status = RideStatus.ARRIVED;
  ride.arrivedAt = new Date();

  await ride.save();

  return ride;
}


async startRide(id: string, otp: string) {
  const ride = await this.rideModel.findById(id);

  if (!ride) throw new Error('Ride not found');

  if (ride.status !== RideStatus.ARRIVED) {
    throw new Error('Driver has not arrived yet');
  }

  const driver = await this.driverModel.findById(ride.driverId);

if (!driver?.currentLocation) {
  throw new Error('Driver location missing');
}

const [lng, lat] = driver.currentLocation.coordinates;

const distance = this.calculateDistance(
  lat,
  lng,
  ride.pickupLat,
  ride.pickupLng
);

  if (distance > 100) {
  throw new Error('Driver too far from pickup');
}



  if (ride.otp !== otp) {
    throw new Error('Invalid OTP');
  }

  ride.status = RideStatus.STARTED;
  await ride.save();

  return ride;
}

async completeRide(
  rideId: string,
  paymentMode: "CASH" | "ONLINE"
): Promise<{ ride: Ride; paymentRequired: boolean }> {

  const ride = await this.rideModel.findById(rideId);

  if (!ride) throw new Error("Ride not found");

  if (ride.status !== RideStatus.STARTED)
    throw new Error("Ride not in STARTED state");
  ride.completedAt = new Date();

  if (paymentMode === "CASH") {
    ride.paymentMethod = "CASH";
    ride.paymentStatus = "PAID";

    await ride.save();
    await this.updateDriverWallet(ride, "CASH");

    return { ride, paymentRequired: false };
  }

  if (paymentMode === "ONLINE") {
    ride.paymentMethod = "STRIPE";
    ride.paymentStatus = "PENDING";

    await ride.save();

    // Stripe session should be created here
    // After webhook success → call updateDriverWallet(ride, "ONLINE")

    return { ride, paymentRequired: true };
  }

  throw new Error("Invalid payment mode");
}


private calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) *
      Math.cos(φ2) *
      Math.sin(Δλ / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}


async confirmPayment(
  rideId: string,
  method: "CASH" | "WALLET"
) {
  const ride = await this.rideModel.findById(rideId);

  if (!ride) throw new Error("Ride not found");

  if (ride.paymentStatus === "PAID")
    throw new Error("Already paid");

  ride.paymentMethod = method;

  if (method === "CASH") {
    await this.handleCashPayment(ride);
  }

  if (method === "WALLET") {
    await this.handleWalletPayment(ride);
  }

  ride.paymentStatus = "PAID";
  await ride.save();

  return ride;
}

private async handleCashPayment(ride: Ride) {
  const driverWallet = await this.walletModel.findOne({
    driverId: ride.driverId,
  });

  if (!driverWallet) throw new Error("Driver wallet not found");

  const commission = ride.riderPrice * 0.20;

  driverWallet.balance -= commission;
  driverWallet.totalCommissionPaid += commission;

  await driverWallet.save();
}

private async handleWalletPayment(ride: Ride) {
  const driverWallet = await this.walletModel.findOne({
    driverId: ride.driverId,
  });

  if (!driverWallet) throw new Error("Driver wallet not found");

  driverWallet.balance += ride.driverEarning;
  driverWallet.totalEarnings += ride.driverEarning;

  await driverWallet.save();
}


  private async updateDriverWallet(
  ride: Ride,
  paymentMode: "CASH" | "ONLINE"
) {
  const driverWallet = await this.walletModel.findOne({
    driverId: ride.driverId,
  });

  if (!driverWallet)
    throw new Error("Driver wallet not found");

  const commission = ride.riderPrice * 0.20;

  if (paymentMode === "CASH") {
    // Rider paid driver full amount
    // Driver owes platform commission

    driverWallet.balance -= commission;
    driverWallet.totalCommissionPaid += commission;
    driverWallet.lastPaymentMethod = "CASH";
  }

  if (paymentMode === "ONLINE") {
    // Platform received money
    // Driver gets earning after commission

    driverWallet.balance += ride.driverEarning;
    driverWallet.totalEarnings += ride.driverEarning;
    driverWallet.lastPaymentMethod = "ONLINE";
  }

  await driverWallet.save();
}


}
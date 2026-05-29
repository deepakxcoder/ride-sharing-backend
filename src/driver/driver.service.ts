import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DriverProfile, DriverStatus } from './schemas/driver-profile.schema';
import { User } from '../users/schemas/user.schema';
import Redis from 'ioredis';
import { Ride } from '../rides/schemas/ride.schema';

@Injectable()
export class DriverService {
  constructor(
    @InjectModel(DriverProfile.name)
    private driverModel: Model<DriverProfile>,
    @InjectModel(Ride.name)
    private readonly rideModel:Model<Ride>,

    @InjectModel(User.name)
    private userModel: Model<User>,
    @Inject('REDIS_CLIENT')
    private readonly redis:Redis,
  ) {}

  async apply(data: {
    userId: string;
    vehicleType: string;
    vehicleNumber: string;
    vehicleModel: string;
  }) {
    const user = await this.userModel.findById(data.userId);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.driverProfileId) {
      throw new BadRequestException('Already applied as driver');
    }

    // Create driver profile
    const driverProfile = await this.driverModel.create({
      userId: user._id,
      vehicleType: data.vehicleType,
      vehicleNumber: data.vehicleNumber,
      vehicleModel: data.vehicleModel,
      status: DriverStatus.PENDING,
      currentLocation: {
  type: 'Point',
  coordinates: [0, 0]
}
    });

    // Attach to user
    user.driverProfileId = String(driverProfile._id);
    await user.save();

    return {
      message: 'Driver application submitted',
      status: driverProfile.status,
      driverProfileId : String(driverProfile._id),
    };
  }

 async uploadDocuments(
  userId: string,
  files: {
    license?: Express.Multer.File[];
    rc?: Express.Multer.File[];
    insurance?: Express.Multer.File[];
  },
) {
  const user = await this.userModel.findById(userId);
  if (!user || !user.driverProfileId) {
    throw new BadRequestException('Driver profile not found');
  }

  const driver = await this.driverModel.findById(user.driverProfileId);
  if (!driver) throw new BadRequestException('Driver profile missing');

  if (driver.status === DriverStatus.APPROVED) {
    throw new BadRequestException('Driver already approved');
  }

  // Store file paths (later replace with S3 / Cloudinary)
  if (files.license) driver.licenseUrl = files.license[0].path;
  if (files.rc) driver.rcUrl = files.rc[0].path;
  if (files.insurance) driver.insuranceUrl = files.insurance[0].path;

  driver.status = DriverStatus.PENDING;
  await driver.save();

  return {
    message: 'Documents uploaded. Awaiting admin verification.',
    status: driver.status,
  };
}

//UPDATE STATUS FUNCTION (OFFLINE/ONLINE)

 async updateDriverStatus(body: {
  userId: string;
  isOnline: boolean;
  lat?: number;
  lng?: number;
}) {
  const { userId, isOnline, lat, lng } = body;

  const driver = await this.driverModel.findOne({
    userId: new Types.ObjectId(userId),
  });

  if (!driver) {
    throw new NotFoundException('Driver profile not found');
  }

  // 🔴 CASE 1: DRIVER NOT APPROVED
  if (driver.status !== 'APPROVED') {

    if (driver.status === 'REJECTED') {
      throw new ForbiddenException({
        message: driver.rejectionReason || 'Your documents were rejected',
        status: 'REJECTED',
        rejectedDocuments: driver.rejectedDocuments || [],
      });
    }

    throw new ForbiddenException({
      message: 'Your documents are under verification',
      status: 'PENDING',
    });
  }

  // 🔥 NEW: BLOCK OFFLINE IF ACTIVE RIDE EXISTS
  if (!isOnline) {
    await this.redis.zrem('drivers:available', driver._id.toString());
    const activeRide = await this.rideModel.findOne({
      driverId: driver._id,
      status: { $in: ['ACCEPTED', 'ARRIVED', 'ON_TRIP'] },
    });

    if (activeRide) {
      throw new BadRequestException(
        'Cannot go offline during active ride'
      );
    }
  }

  // 🔴 CASE 2: GOING ONLINE → LOCATION REQUIRED
  if (isOnline) {
    if (lat === undefined || lng === undefined) {
      throw new BadRequestException(
        'Location is required to go online'
      );
    }

    driver.currentLocation = {
      type: 'Point',
      coordinates: [lng, lat],
    };

    await this.redis.geoadd(
      'drivers:available',
      lng,
      lat,
      driver._id.toString(),
    );
  }

  // 🔴 CASE 3: GOING OFFLINE → REMOVE FROM REDIS
  if (!isOnline) {
    await this.redis.zrem(
      'drivers:available',
      driver._id.toString(),
    );
  }

  // ✅ Toggle
  driver.isOnline = isOnline;
  await driver.save();

  return {
    success: true,
    isOnline: driver.isOnline,
  };
}

async getDriverByUserId(userId: string) {
 if (!Types.ObjectId.isValid(userId)) {
    console.log("Invalid ObjectId format");
    return null;
  }

  return this.driverModel.findOne({
    userId: new Types.ObjectId(userId),
  });
}




}

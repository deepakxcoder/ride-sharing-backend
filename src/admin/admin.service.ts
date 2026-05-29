import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DriverProfile, DriverStatus } from '../driver/schemas/driver-profile.schema';
import { User } from '../users/schemas/user.schema';
import { DriverWallet } from '../driver/schemas/driver-wallet.schema';

@Injectable()
export class AdminService {
    constructor(
    @InjectModel(DriverProfile.name)
    private driverModel: Model<DriverProfile>,

    @InjectModel(User.name)
    private userModel: Model<User>,
    @InjectModel(DriverWallet.name) private walletModel:Model<DriverWallet>,
  ) {}

    async approveDriver(driverProfileId:string){
        const driver = await this.driverModel.findById(driverProfileId);
        if(!driver) throw new BadRequestException("Driver Not Found");
        driver.status = DriverStatus.APPROVED;
  driver.rejectionReason = '';
  driver.rejectedDocuments =[] ;
        await driver.save();

        await this.userModel.findByIdAndUpdate(driver.userId, {
      $addToSet: { roles: 'driver' },
    });
    
   // 🔥 CREATE WALLET IF NOT EXISTS
    const existingWallet = await this.walletModel.findOne({
      driverId: driver._id,
    });

    if (!existingWallet) {
      await this.walletModel.create({
        driverId: driver._id,
      });
    }
    return { message: 'Driver approved' };
    }


   async rejectDriver(
  driverProfileId: string,
  data: { reason: string; documents: string[] },
) {
  const driver = await this.driverModel.findById(driverProfileId);
  if (!driver) throw new BadRequestException('Driver not found');

  driver.status = DriverStatus.REJECTED;
  driver.rejectionReason = data.reason;
  driver.rejectedDocuments = data.documents;

  await driver.save();

  return { message: 'Driver rejected with reason' };
}


    // admin.service.ts
async getDriversByStatus(status: string) {
  const drivers = await this.driverModel
    .find({ status: status.toUpperCase() })
    .populate('userId', 'firstName lastName phoneNumber');
    return drivers;
}

async getDashboardStats() {
  const totalUsers = await this.userModel.countDocuments();
  // Count drivers who are currently Online
  const activeDrivers = await this.driverModel.countDocuments({ isOnline: true });
  // Count Pending Applications
  const pendingApprovals = await this.driverModel.countDocuments({ status: 'PENDING' });

  return { totalUsers, activeDrivers, pendingApprovals };
}

}

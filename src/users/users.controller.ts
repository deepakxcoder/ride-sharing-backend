import { Controller, Patch, Param, Body, Inject, Post } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import { RidesService } from '../rides/rides.service';

@Controller('users')
export class UsersController {
  constructor(@InjectModel(User.name) private userModel: Model<User>,
  private rideService:RidesService) {}

  // Since we aren't using JWT yet, we pass ID in the URL: /users/65a...
  @Patch(':id')
  async updateProfile(
    @Param('id') id: string,
    @Body() body: { firstName: string; lastName: string; email: string },
  ) {
    const updatedUser = await this.userModel.findByIdAndUpdate(id, body, {
      new: true, // Return the updated object
    });
    return updatedUser;
  }

  @Post('request-ride')
async requestRide(@Body() body) {
  const drivers = await this.rideService.findNearestDrivers(
    body.pickupLat,
    body.pickupLng
  );

  return drivers;
}

}
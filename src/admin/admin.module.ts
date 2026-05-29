import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { DriverModule } from '../driver/driver.module';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import { DriverProfile, DriverProfileSchema } from '../driver/schemas/driver-profile.schema';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    DriverModule, // gives access to DriverProfile model
  ],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
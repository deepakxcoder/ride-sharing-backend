import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { RidesModule } from '../rides/rides.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
    ]),
    RidesModule
  ],
  providers: [UsersService],
  controllers:[UsersController],
  exports: [
    MongooseModule, // ✅ export ONLY for User
  ],
})
export class UsersModule {}
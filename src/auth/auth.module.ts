import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import { MailModule } from '../mail/mail.module';

@Module({
  imports:[
    MongooseModule.forFeature([
      {name : User.name, schema : UserSchema},
    ]),
    MailModule,
  ],
  providers: [AuthService],
  controllers: [AuthController]
})
export class AuthModule {}

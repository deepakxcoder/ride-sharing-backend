import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true }) // Adds createdAt and updatedAt automatically
export class User extends Document {
  @Prop({ required: true, unique: true })
  phoneNumber: string;

  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  @Prop({ unique: true, sparse: true }) // sparse allows nulls to not be unique
  email: string;

  @Prop({ default: ['rider'] })
  roles: string[]; // ['rider', 'driver','admin']

  @Prop({ default: false })
  isVerified: boolean; // Set to true after first OTP success
  
  @Prop({type:String, ref:'DriverProfile', default:null})
  driverProfileId?:string;
  @Prop({default:true})
  isNewUser:boolean
}

export const UserSchema = SchemaFactory.createForClass(User);
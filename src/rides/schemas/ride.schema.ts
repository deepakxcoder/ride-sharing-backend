import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { RideType } from '../../common/enums/ride-type.enum';

export enum RideStatus {
  SEARCHING = 'SEARCHING',
  ACCEPTED = 'ACCEPTED',
  ARRIVED = 'ARRIVED',
  STARTED = 'STARTED',
  COMPLETED = 'COMPLETED',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true })
export class Ride {

  @Prop({ type: Types.ObjectId, required: true })
  riderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, default: null })
  driverId: Types.ObjectId | null;

  @Prop({ required: true })
pickupLat: number;

@Prop({ required: true })
pickupLng: number;

@Prop()
pickupAddress: string;   // ✅ ADD

@Prop({ required: true })
dropLat: number;

@Prop({ required: true })
dropLng: number;

@Prop()
dropoffAddress: string;  // ✅ ADD

@Prop({ enum: RideType, required: true })
  rideType: RideType;

@Prop({ required: true })
  riderPrice: number;

@Prop({ required: true })
  driverEarning: number;

  @Prop()
otp: string;

@Prop()
arrivedAt?: Date;

@Prop()
finalFare: number;

@Prop()
platformCommission: number;

@Prop()
completedAt?: Date;

@Prop({
  type: String,
  enum: ["PENDING", "PAID", "FAILED"],
  default: "PENDING",
})
paymentStatus: "PENDING" | "PAID" | "FAILED";

@Prop({
  type: String,
  enum: ["CASH", "WALLET", "STRIPE"],
})
paymentMethod?: "CASH" | "WALLET" | "STRIPE";


@Prop({ enum: RideStatus, default: RideStatus.SEARCHING })
  status: RideStatus;


  @Prop()
stripePaymentIntentId?: string;

@Prop()
stripeChargeId?: string;

@Prop()
paidAt?: Date;

@Prop()
failureReason?: string;

}

export const RideSchema = SchemaFactory.createForClass(Ride);

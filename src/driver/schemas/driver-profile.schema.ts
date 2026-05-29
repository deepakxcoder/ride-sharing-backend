import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';


export enum DriverStatus {
  NOT_APPLIED = 'NOT_APPLIED',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}
export enum DocStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Schema({ timestamps: true })
export class DriverProfile extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: DriverStatus, default: DriverStatus.PENDING })
  status: DriverStatus;

  // Vehicle info
  @Prop()
  vehicleType: string; // car | bike | auto

  @Prop()
  vehicleNumber: string;

  @Prop()
  vehicleModel: string;

  // Documents
  @Prop()
  licenseUrl: string;

  @Prop()
  rcUrl: string;

  @Prop()
  insuranceUrl: string;

  @Prop({ default: false })
  isOnline: boolean;

  @Prop()
  rejectionReason?: string;

  @Prop({ type: [String], default: [] })
  rejectedDocuments?: string[]; // ['license', 'rc']
  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  })
  currentLocation?: {
    type: 'Point';
    coordinates: [number, number];
  };

  // // ... inside DriverProfile class
  //   @Prop({ default: 0 })
  //   heading: number; // 0 - 360 degrees for car rotation icon
  //
}
export const DriverProfileSchema =
  SchemaFactory.createForClass(DriverProfile);

DriverProfileSchema.index({ currentLocation: '2dsphere' }, { sparse: true });


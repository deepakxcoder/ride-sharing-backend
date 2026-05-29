import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";

@Schema({ timestamps: true })
export class DriverWallet {

  @Prop({ type: Types.ObjectId, ref: "DriverProfile", required: true })
  driverId: Types.ObjectId;

  @Prop({ default: 0 })
  balance: number;

  @Prop({ default: 0 })
  totalEarnings: number;

  @Prop({ default: 0 })
  totalCommissionPaid: number;

  @Prop({ enum: ["CASH", "ONLINE"], required: false })
  lastPaymentMethod?: "CASH" | "ONLINE";

@Prop({ default: 0 })
totalOnlineEarnings: number;

@Prop({ default: 0 })
totalCashEarnings: number;

@Prop({ default: 0 })
pendingSettlement: number;

@Prop({ default: 0 })
lifetimeEarnings: number;
}

export const DriverWalletSchema =
  SchemaFactory.createForClass(DriverWallet);
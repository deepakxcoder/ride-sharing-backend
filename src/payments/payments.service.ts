import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Ride } from '../rides/schemas/ride.schema';
import { StripeService } from './stripe.service';
import { RideStatus } from '../rides/schemas/ride.schema';
import { DriverWallet } from '../driver/schemas/driver-wallet.schema';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Ride.name) private rideModel: Model<Ride>,
    @InjectModel(DriverWallet.name) private walletModel:Model<DriverWallet>,
    private stripeService: StripeService,
  ) {}

  async createIntent(rideId: string) {
  const ride = await this.rideModel.findById(rideId);

  if (!ride) throw new Error('Ride not found');
  if (ride.paymentStatus === 'PAID')
    throw new Error('Already paid');

  const intent = await this.stripeService.createPaymentIntent(
    ride.riderPrice,
    ride._id.toString(),
  );

  ride.stripePaymentIntentId = intent.id;
  ride.paymentStatus = "PENDING";
  ride.status = RideStatus.PAYMENT_PENDING;

  await ride.save();

  return intent.client_secret;
}

 async handleSuccessfulPayment(rideId: string, paymentIntent: any) {
  const ride = await this.rideModel.findById(rideId);

  if (!ride) throw new Error('Ride not found');

  if (ride.paymentStatus === 'PAID') return;

  if (ride.stripePaymentIntentId !== paymentIntent.id) return;

  ride.paymentStatus = 'PAID';
  ride.status = RideStatus.COMPLETED;
  ride.paidAt = new Date();
  ride.stripeChargeId = paymentIntent.latest_charge;

  await ride.save();

  // 🔥 IMPORTANT — update driver wallet
  await this.updateDriverWalletAfterStripe(ride);
}

private async updateDriverWalletAfterStripe(ride: Ride) {
  const wallet = await this.walletModel.findOne({
    driverId: ride.driverId,
  });

  if (!wallet) throw new Error("Wallet not found");

  wallet.balance += ride.driverEarning;
  wallet.totalOnlineEarnings += ride.driverEarning;
  wallet.totalEarnings += ride.driverEarning;
  wallet.lifetimeEarnings += ride.driverEarning;

  await wallet.save();
}
}
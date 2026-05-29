import { Injectable } from '@nestjs/common';
import { ApiVersion } from 'node_modules/stripe/types/apiVersion';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion:"2026-01-28.clover"
    });
  }

  async createPaymentIntent(amount: number, rideId: string) {
    return this.stripe.paymentIntents.create({
      amount: amount * 100, // convert to paisa
      currency: 'inr',
      metadata: {
        rideId,
      },
    });
  }

  constructWebhookEvent(rawBody: Buffer, signature: string) {
    return this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  }
}

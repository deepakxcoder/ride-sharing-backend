import {
  Controller,
  Post,
  Param,
  Req,
  Headers,
  Res,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.service';
import type { Response } from 'express';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Controller('payments')
export class PaymentsController {
  constructor(
    private paymentsService: PaymentsService,
    private stripeService: StripeService,
    private realtimeGateway:RealtimeGateway,
  ) {}

  @Post('create-intent/:rideId')
  async createIntent(@Param('rideId') rideId: string) {
    const clientSecret =
      await this.paymentsService.createIntent(rideId);

    return { clientSecret };
  }

  @Post('webhook')
  async webhook(
    @Req() req: any,
    @Headers('stripe-signature') signature: string,
    @Res() res: Response,
  ) {
    const event = this.stripeService.constructWebhookEvent(
      req.body,
      signature,
    );

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent: any = event.data.object;
      const rideId = paymentIntent.metadata.rideId;

      await this.paymentsService.handleSuccessfulPayment(
        rideId, paymentIntent
      );

       // Emit event via Gateway
    this.realtimeGateway.handleConfirmPayment({ rideId, method: 'ONLINE' });
    }


    return res.status(200).json({ received: true });
  }
}
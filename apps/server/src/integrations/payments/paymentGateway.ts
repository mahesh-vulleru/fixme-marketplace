import crypto from 'crypto';
import { env } from '../../config/env';

export interface PaymentIntentResult {
  provider: string;
  providerOrderId: string;
  amountPaise: number;
  currency: 'INR';
  keyId: string;
}

export class PaymentGateway {
  static createPaymentIntent(params: {
    orderId: string;
    orderNumber: string;
    amountPaise: number;
  }): PaymentIntentResult {
    const providerOrderId = `pay_ord_${params.orderNumber}_${crypto.randomUUID().slice(0, 8)}`;
    return {
      provider: env.PAYMENT_PROVIDER,
      providerOrderId,
      amountPaise: params.amountPaise,
      currency: 'INR',
      keyId: 'rzp_test_fixme_public_key',
    };
  }

  static signWebhookPayload(payload: string): string {
    return crypto
      .createHmac('sha256', env.PAYMENT_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');
  }

  static verifyWebhookSignature(payload: string, signature?: string): boolean {
    if (!signature) return false;
    const expected = this.signWebhookPayload(payload);
    if (expected.length !== signature.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }
}


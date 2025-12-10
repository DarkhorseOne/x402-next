import type { PaymentRequirement } from '@darkhorseone/x402-core';
import {
  PaymentExpiredError,
  PaymentInvalidError,
  PaymentNetworkError,
  PaymentRequiredError,
} from '@darkhorseone/x402-core';
import { NextResponseBuilder } from '../adapters/NextResponseBuilder';

/**
 * Maps x402-core errors to HTTP responses in a Next.js context.
 */
export class X402NextErrorMapper {
  static toResponse(err: unknown, requirement?: PaymentRequirement): Response {
    if (err instanceof PaymentRequiredError) {
      const fallbackRequirement = (err as { requirement?: PaymentRequirement }).requirement;
      if (fallbackRequirement) {
        return NextResponseBuilder.paymentRequired(fallbackRequirement);
      }
      if (requirement) {
        return NextResponseBuilder.paymentRequired(requirement);
      }
      return NextResponseBuilder.internalError('Payment required but requirement is unavailable');
    }

    if (err instanceof PaymentInvalidError || err instanceof PaymentExpiredError) {
      if (requirement) {
        return NextResponseBuilder.paymentRequired(requirement);
      }
      return NextResponseBuilder.internalError('Payment invalid or expired');
    }

    if (err instanceof PaymentNetworkError) {
      return NextResponseBuilder.serviceUnavailable(err.message);
    }

    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponseBuilder.internalError(message);
  }
}

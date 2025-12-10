import { NextResponse } from 'next/server';
import type { PaymentRequirement } from '@darkhorseone/x402-core';

/**
 * Helper to build standardised Next.js responses for x402 events.
 */
export class NextResponseBuilder {
  static paymentRequired(requirement: PaymentRequirement): Response {
    return NextResponse.json(
      {
        error: 'payment_required',
        payment: requirement,
        message: 'Payment required to access this resource.',
      },
      { status: 402 },
    ) as unknown as Response;
  }

  static serviceUnavailable(message = 'Payment verification service unavailable'): Response {
    return NextResponse.json(
      {
        error: 'payment_service_unavailable',
        message,
      },
      { status: 503 },
    ) as unknown as Response;
  }

  static internalError(message = 'Internal server error'): Response {
    return NextResponse.json(
      {
        error: 'internal_error',
        message,
      },
      { status: 500 },
    ) as unknown as Response;
  }
}

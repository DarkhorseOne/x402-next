import { describe, expect, it } from 'vitest';
import { NextResponseBuilder } from '../src/adapters/NextResponseBuilder';
import { makeRequirement } from './helpers';
import { X402NextErrorMapper } from '../src/errors/X402NextErrorMapper';
import { PaymentNetworkError, PaymentRequiredError } from '@darkhorseone/x402-core';

describe('NextResponseBuilder', () => {
  it('returns 402 payload with requirement', async () => {
    const requirement = makeRequirement();
    const res = NextResponseBuilder.paymentRequired(requirement);
    const body = await res.json();

    expect(res.status).toBe(402);
    expect(body.error).toBe('payment_required');
    expect(body.payment).toEqual(requirement);
  });

  it('returns 503 payload with message', async () => {
    const res = NextResponseBuilder.serviceUnavailable('offline');
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.message).toBe('offline');
  });
});

describe('X402NextErrorMapper', () => {
  it('maps PaymentRequiredError to 402', async () => {
    const requirement = makeRequirement();
    const error = new PaymentRequiredError(requirement);
    const res = X402NextErrorMapper.toResponse(error);
    const body = await res.json();

    expect(res.status).toBe(402);
    expect(body.payment).toEqual(requirement);
  });

  it('maps PaymentNetworkError to 503', async () => {
    const res = X402NextErrorMapper.toResponse(new PaymentNetworkError('offline'));
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.error).toBe('payment_service_unavailable');
  });
});

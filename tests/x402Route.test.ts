import { describe, expect, it, vi } from 'vitest';
import { x402Route } from '../src/handlers/x402Route';
import { makeRequirement } from './helpers';
import type { PaymentVerificationResult, PaymentCredential } from '@darkhorseone/x402-core';
import { PaymentNetworkError } from '@darkhorseone/x402-core';

const config = { price: '0.01', asset: 'USDC', network: 'base-mainnet', description: 'test' };

const createDeps = () => {
  const requirement = makeRequirement();
  const requirementBuilder = { build: vi.fn().mockReturnValue(requirement) };
  const credentialExtractor = { extract: vi.fn<[], PaymentCredential | null>() };
  const verifier = { verify: vi.fn<[], Promise<PaymentVerificationResult>>() };
  return { requirement, requirementBuilder, credentialExtractor, verifier };
};

describe('x402Route', () => {
  it('returns 402 when credential is missing', async () => {
    const { requirement, requirementBuilder, credentialExtractor, verifier } = createDeps();
    credentialExtractor.extract.mockReturnValue(null);
    verifier.verify.mockResolvedValue({ status: 'success' });

    const handler = vi.fn(async () => new Response('ok', { status: 200 }));
    const route = x402Route(config, handler, {
      requirementBuilder: requirementBuilder as any,
      credentialExtractor: credentialExtractor as any,
      verifier: verifier as any,
    });

    const res = await route(new Request('https://example.com'));
    const body = await res.json();

    expect(res.status).toBe(402);
    expect(body.error).toBe('payment_required');
    expect(body.payment).toEqual(requirement);
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns 402 when verification result is not success', async () => {
    const { requirement, requirementBuilder, credentialExtractor, verifier } = createDeps();
    credentialExtractor.extract.mockReturnValue({ raw: 'token' });
    verifier.verify.mockResolvedValue({ status: 'invalid' });

    const handler = vi.fn(async () => new Response('ok', { status: 200 }));
    const route = x402Route(config, handler, {
      requirementBuilder: requirementBuilder as any,
      credentialExtractor: credentialExtractor as any,
      verifier: verifier as any,
    });

    const res = await route(new Request('https://example.com'));
    const body = await res.json();

    expect(res.status).toBe(402);
    expect(body.payment).toEqual(requirement);
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns 503 when verifier throws network error', async () => {
    const { requirementBuilder, credentialExtractor, verifier } = createDeps();
    credentialExtractor.extract.mockReturnValue({ raw: 'token' });
    verifier.verify.mockRejectedValue(new PaymentNetworkError('offline'));

    const handler = vi.fn(async () => new Response('ok', { status: 200 }));
    const route = x402Route(config, handler, {
      requirementBuilder: requirementBuilder as any,
      credentialExtractor: credentialExtractor as any,
      verifier: verifier as any,
    });

    const res = await route(new Request('https://example.com'));
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.error).toBe('payment_service_unavailable');
    expect(handler).not.toHaveBeenCalled();
  });

  it('delegates to handler when verification succeeds', async () => {
    const { requirementBuilder, credentialExtractor, verifier } = createDeps();
    credentialExtractor.extract.mockReturnValue({ raw: 'token' });
    verifier.verify.mockResolvedValue({ status: 'success' });

    const handler = vi.fn(async () => new Response('ok', { status: 200 }));
    const route = x402Route(config, handler, {
      requirementBuilder: requirementBuilder as any,
      credentialExtractor: credentialExtractor as any,
      verifier: verifier as any,
    });

    const res = await route(new Request('https://example.com'));
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(text).toBe('ok');
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

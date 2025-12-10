import { describe, expect, it, vi } from 'vitest';
import { withX402 } from '../src/handlers/withX402';
import { makeRequirement } from './helpers';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { PaymentVerificationResult, PaymentCredential } from '@darkhorseone/x402-core';
import { PaymentNetworkError } from '@darkhorseone/x402-core';

const config = { price: '0.02', asset: 'USDC', network: 'base-mainnet', description: 'pages test' };

const createDeps = () => {
  const requirement = makeRequirement();
  const requirementBuilder = { build: vi.fn().mockReturnValue(requirement) };
  const credentialExtractor = { extract: vi.fn<[], PaymentCredential | null>() };
  const verifier = { verify: vi.fn<[], Promise<PaymentVerificationResult>>() };
  return { requirement, requirementBuilder, credentialExtractor, verifier };
};

const createApiContext = (overrides: Partial<NextApiRequest> = {}) => {
  const req: Partial<NextApiRequest> = {
    method: 'GET',
    url: '/api/test',
    headers: {},
    query: {},
    body: {},
    ...overrides,
  };

  let statusCode = 200;
  let jsonBody: any;
  const headers: Record<string, any> = {};

  const res: Partial<NextApiResponse> = {
    setHeader: (key: string, value: any) => {
      headers[key] = value;
      return res as NextApiResponse;
    },
    status: (code: number) => {
      statusCode = code;
      return res as NextApiResponse;
    },
    json: (body: any) => {
      jsonBody = body;
      return res as NextApiResponse;
    },
    send: (body: any) => {
      jsonBody = body;
      return res as NextApiResponse;
    },
    end: () => res as NextApiResponse,
  };

  return { req: req as NextApiRequest, res: res as NextApiResponse, getResult: () => ({ statusCode, jsonBody, headers }) };
};

describe('withX402', () => {
  it('returns 402 when credential is missing', async () => {
    const { requirement, requirementBuilder, credentialExtractor, verifier } = createDeps();
    credentialExtractor.extract.mockReturnValue(null);
    verifier.verify.mockResolvedValue({ status: 'success' });

    const handler = vi.fn();
    const wrapped = withX402(config, handler as any, {
      requirementBuilder: requirementBuilder as any,
      credentialExtractor: credentialExtractor as any,
      verifier: verifier as any,
    });

    const { req, res, getResult } = createApiContext();
    await wrapped(req, res);
    const result = getResult();

    expect(result.statusCode).toBe(402);
    expect(result.jsonBody.error).toBe('payment_required');
    expect(result.jsonBody.payment).toEqual(requirement);
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns 402 when verification fails', async () => {
    const { requirement, requirementBuilder, credentialExtractor, verifier } = createDeps();
    credentialExtractor.extract.mockReturnValue({ raw: 'token' });
    verifier.verify.mockResolvedValue({ status: 'invalid' });

    const handler = vi.fn();
    const wrapped = withX402(config, handler as any, {
      requirementBuilder: requirementBuilder as any,
      credentialExtractor: credentialExtractor as any,
      verifier: verifier as any,
    });

    const { req, res, getResult } = createApiContext();
    await wrapped(req, res);
    const result = getResult();

    expect(result.statusCode).toBe(402);
    expect(result.jsonBody.payment).toEqual(requirement);
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns 503 when verifier throws network error', async () => {
    const { requirementBuilder, credentialExtractor, verifier } = createDeps();
    credentialExtractor.extract.mockReturnValue({ raw: 'token' });
    verifier.verify.mockRejectedValue(new PaymentNetworkError('offline'));

    const handler = vi.fn();
    const wrapped = withX402(config, handler as any, {
      requirementBuilder: requirementBuilder as any,
      credentialExtractor: credentialExtractor as any,
      verifier: verifier as any,
    });

    const { req, res, getResult } = createApiContext();
    await wrapped(req, res);
    const result = getResult();

    expect(result.statusCode).toBe(503);
    expect(result.jsonBody.error).toBe('payment_service_unavailable');
    expect(handler).not.toHaveBeenCalled();
  });

  it('delegates to handler when verification succeeds', async () => {
    const { requirementBuilder, credentialExtractor, verifier } = createDeps();
    credentialExtractor.extract.mockReturnValue({ raw: 'token' });
    verifier.verify.mockResolvedValue({ status: 'success' });

    const handler = vi.fn((req: NextApiRequest, res: NextApiResponse) => {
      res.status(200).json({ ok: true });
    });
    const wrapped = withX402(config, handler as any, {
      requirementBuilder: requirementBuilder as any,
      credentialExtractor: credentialExtractor as any,
      verifier: verifier as any,
    });

    const { req, res, getResult } = createApiContext();
    await wrapped(req, res);
    const result = getResult();

    expect(result.statusCode).toBe(200);
    expect(result.jsonBody).toEqual({ ok: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

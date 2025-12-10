import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import {
  DefaultPaymentVerifier,
  HttpFacilitatorAdapter,
  PaymentCredentialExtractor,
  PaymentRequirementBuilder,
  type PaymentVerificationResult,
} from '@darkhorseone/x402-core';
import type { PaymentRequirement } from '@darkhorseone/x402-core';
import { NextRequestAdapter } from '../adapters/NextRequestAdapter';
import { NextResponseBuilder } from '../adapters/NextResponseBuilder';
import { X402NextErrorMapper } from '../errors/X402NextErrorMapper';
import type { X402NextDeps, X402ResolvedDeps } from '../types/NextContextTypes';

export interface WithX402Config {
  price: string;
  asset?: string;
  network?: string;
  description?: string;
}

/**
 * Wraps a Next.js Pages Router handler with x402 enforcement.
 * Returns 402 when payment is missing/invalid, 503 on facilitator issues, and 500 on unexpected errors.
 */
export const withX402 =
  (
    config: WithX402Config,
    handler: NextApiHandler,
    deps?: X402NextDeps,
  ): NextApiHandler =>
  async (req: NextApiRequest, res: NextApiResponse) => {
    const adapter = new NextRequestAdapter();
    const resolvedDeps = resolveDeps(deps);

    let requirement: PaymentRequirement;
    try {
      requirement = resolvedDeps.requirementBuilder.build(config);
    } catch (err) {
      return sendApiResponse(res, X402NextErrorMapper.toResponse(err));
    }

    let adapted;
    try {
      adapted = adapter.adaptApiRequest(req);
    } catch (err) {
      return sendApiResponse(res, X402NextErrorMapper.toResponse(err, requirement));
    }

    const credential = resolvedDeps.credentialExtractor.extract(adapted);
    if (!credential) {
      return sendApiResponse(res, NextResponseBuilder.paymentRequired(requirement));
    }

    try {
      const verification = await resolvedDeps.verifier.verify(credential, requirement);
      if (!isSuccess(verification)) {
        return sendApiResponse(res, NextResponseBuilder.paymentRequired(requirement));
      }
    } catch (err) {
      return sendApiResponse(res, X402NextErrorMapper.toResponse(err, requirement));
    }

    try {
      return await handler(req, res);
    } catch (err) {
      return sendApiResponse(res, X402NextErrorMapper.toResponse(err, requirement));
    }
  };

function sendApiResponse(res: NextApiResponse, response: Response): Promise<void> {
  const headers = response.headers;
  headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  res.status(response.status);
  return response
    .text()
    .then((body) => {
      try {
        const parsed = body ? JSON.parse(body) : undefined;
        res.json(parsed ?? {});
      } catch {
        // Fall back to plain text if parsing fails.
        res.send ? res.send(body) : res.end(body);
      }
    })
    .catch(() => {
      res.end();
    });
}

function isSuccess(result: PaymentVerificationResult): boolean {
  return result?.status === 'success';
}

function resolveDeps(deps?: X402NextDeps): X402ResolvedDeps {
  const credentialExtractor = deps?.credentialExtractor ?? new PaymentCredentialExtractor();

  let requirementBuilder = deps?.requirementBuilder;
  if (!requirementBuilder) {
    if (!deps?.coreConfig) {
      throw new Error('X402 coreConfig is required to build payment requirements.');
    }
    requirementBuilder = new PaymentRequirementBuilder(deps.coreConfig);
  }

  let verifier = deps?.verifier;
  if (!verifier) {
    if (!deps?.coreConfig) {
      throw new Error('X402 coreConfig is required to verify payments.');
    }
    const facilitatorClient = deps.facilitatorClient ?? new HttpFacilitatorAdapter(deps.coreConfig, deps.fetchImpl ?? fetch);
    verifier = new DefaultPaymentVerifier(facilitatorClient);
  }

  return { requirementBuilder, credentialExtractor, verifier };
}

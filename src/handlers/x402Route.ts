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

export interface X402RouteConfig {
  price: string;
  asset?: string;
  network?: string;
  description?: string;
}

/**
 * Wraps a Next.js App Router handler with x402 enforcement.
 * Returns 402 when payment is missing/invalid, 503 on facilitator issues, and 500 on unexpected errors.
 */
export const x402Route = (
  config: X402RouteConfig,
  handler: (req: Request) => Promise<Response> | Response,
  deps?: X402NextDeps,
): ((req: Request) => Promise<Response>) => {
  const adapter = new NextRequestAdapter();
  const resolvedDeps = resolveDeps(deps);

  return async (req: Request): Promise<Response> => {
    let requirement: PaymentRequirement;
    try {
      requirement = resolvedDeps.requirementBuilder.build(config);
    } catch (err) {
      return X402NextErrorMapper.toResponse(err);
    }

    let adapted;
    try {
      adapted = await adapter.adapt(req);
    } catch (err) {
      return X402NextErrorMapper.toResponse(err, requirement);
    }

    const credential = resolvedDeps.credentialExtractor.extract(adapted);
    if (!credential) {
      return NextResponseBuilder.paymentRequired(requirement);
    }

    try {
      const verification = await resolvedDeps.verifier.verify(credential, requirement);
      if (!isSuccess(verification)) {
        return NextResponseBuilder.paymentRequired(requirement);
      }
    } catch (err) {
      return X402NextErrorMapper.toResponse(err, requirement);
    }

    try {
      return await handler(req);
    } catch (err) {
      return X402NextErrorMapper.toResponse(err, requirement);
    }
  };
};

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

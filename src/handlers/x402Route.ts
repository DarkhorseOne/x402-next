import type { PaymentRequirementBuilder, PaymentCredentialExtractor, DefaultPaymentVerifier } from '@darkhorseone/x402-core';
import { NextRequestAdapter } from '../adapters/NextRequestAdapter';
import { NextResponseBuilder } from '../adapters/NextResponseBuilder';

export interface X402RouteConfig {
  price: string;
  asset?: string;
  network?: string;
  description?: string;
}

/**
 * Wraps a Next.js App Router handler with x402 enforcement.
 * Phase 0 skeleton: wires the happy-path control flow, but does not yet
 * integrate with a real facilitator.
 */
export const x402Route = (
  config: X402RouteConfig,
  handler: (req: Request) => Promise<Response> | Response,
  deps?: {
    requirementBuilder: PaymentRequirementBuilder;
    credentialExtractor: PaymentCredentialExtractor;
    verifier: DefaultPaymentVerifier;
  },
): ((req: Request) => Promise<Response>) => {
  const adapter = new NextRequestAdapter();

  return async (req: Request): Promise<Response> => {
    if (!deps) {
      // If no dependencies are provided, simply delegate to the handler.
      return handler(req);
    }

    const adapted = adapter.adapt(req);
    const credential = deps.credentialExtractor.extract(adapted);

    const requirement = deps.requirementBuilder.build({
      price: config.price,
      asset: config.asset,
      network: config.network,
      description: config.description,
    });

    if (!credential) {
      return NextResponseBuilder.paymentRequired(requirement);
    }

    const result = await deps.verifier.verify(credential, requirement);

    if (result.status !== 'success') {
      return NextResponseBuilder.paymentRequired(requirement);
    }

    return handler(req);
  };
};

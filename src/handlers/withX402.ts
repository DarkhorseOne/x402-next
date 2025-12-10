import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import type { PaymentRequirementBuilder, PaymentCredentialExtractor, DefaultPaymentVerifier } from '@darkhorseone/x402-core';

export interface WithX402Config {
  price: string;
  asset?: string;
  network?: string;
  description?: string;
}

/**
 * Wraps a Next.js Pages Router handler with x402 enforcement.
 * Phase 0 skeleton: does not use x402-core yet, but reserves the signature.
 */
export const withX402 =
  (
    _config: WithX402Config,
    handler: NextApiHandler,
    _deps?: {
      requirementBuilder: PaymentRequirementBuilder;
      credentialExtractor: PaymentCredentialExtractor;
      verifier: DefaultPaymentVerifier;
    },
  ): NextApiHandler =>
  async (req: NextApiRequest, res: NextApiResponse) => {
    // TODO: implement x402 enforcement for pages router.
    return handler(req, res);
  };

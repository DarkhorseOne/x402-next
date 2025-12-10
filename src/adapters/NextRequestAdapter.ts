import type { PaymentCredential } from '@darkhorseone/x402-core';

/**
 * Adapter to normalise Next.js Request / NextRequest into a shape that
 * x402-core can work with. Phase 0 skeleton: no transformation.
 */
export class NextRequestAdapter {
  adapt(req: Request): unknown {
    return req;
  }

  /**
   * Optional helper to extract a raw credential from a Next.js Request.
   * Typically this would inspect headers, body or query parameters.
   * Phase 0 skeleton: returns a PaymentCredential with raw request.
   */
  extractCredential(req: Request): PaymentCredential {
    return { raw: req };
  }
}

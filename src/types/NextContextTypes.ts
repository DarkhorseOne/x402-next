import type {
  PaymentCredentialExtractor,
  PaymentRequirementBuilder,
  PaymentVerifier,
  X402Config,
  X402FacilitatorClient,
} from '@darkhorseone/x402-core';

export interface GenericRequest {
  method: string;
  url?: string;
  headers: Headers | Record<string, string | string[] | undefined>;
  query: Record<string, string>;
  body?: unknown;
  raw: unknown;
}

export interface X402NextDeps {
  requirementBuilder?: PaymentRequirementBuilder;
  credentialExtractor?: PaymentCredentialExtractor;
  verifier?: PaymentVerifier;
  coreConfig?: X402Config;
  facilitatorClient?: X402FacilitatorClient;
  fetchImpl?: typeof fetch;
}

export interface X402ResolvedDeps {
  requirementBuilder: PaymentRequirementBuilder;
  credentialExtractor: PaymentCredentialExtractor;
  verifier: PaymentVerifier;
}

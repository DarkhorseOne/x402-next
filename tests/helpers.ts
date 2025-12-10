import type { PaymentRequirement } from '@darkhorseone/x402-core';

export function makeRequirement(overrides: Partial<PaymentRequirement> = {}): PaymentRequirement {
  return {
    amount: '1.0',
    asset: 'USDC',
    network: 'base-mainnet',
    seller: '0xseller',
    facilitator: 'https://facilitator.example',
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    nonce: 'nonce',
    description: 'test requirement',
    ...overrides,
  };
}

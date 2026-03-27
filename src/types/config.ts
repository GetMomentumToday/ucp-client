export interface UCPClientConfig {
  readonly gatewayUrl: string;
  readonly agentProfileUrl: string;
  readonly ucpVersion?: string;
  readonly requestSignature?: string;
}

export const DEFAULT_UCP_VERSION = '2026-01-23';

export const UCP_CAPABILITIES = {
  CHECKOUT: 'dev.ucp.shopping.checkout',
  FULFILLMENT: 'dev.ucp.shopping.fulfillment',
  DISCOUNT: 'dev.ucp.shopping.discount',
  BUYER_CONSENT: 'dev.ucp.shopping.buyer_consent',
  ORDER: 'dev.ucp.shopping.order',
  IDENTITY_LINKING: 'dev.ucp.common.identity_linking',
  AP2_MANDATE: 'dev.ucp.shopping.ap2_mandate',
} as const;

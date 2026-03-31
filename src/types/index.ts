export type { UCPClientConfig } from './config.js';
export { DEFAULT_UCP_VERSION, UCP_CAPABILITIES } from './config.js';

export type { PostalAddress, BuyerConsent, LocalizationContext, JWK } from './common.js';

export type {
  TokenCredential,
  CardCredential,
  PaymentCredential,
  PaymentInstrument,
  PaymentHandlerInstance,
  PaymentHandlerMap,
} from './payment.js';

export type {
  CheckoutSession,
  CheckoutSessionStatus,
  CheckoutExtensions,
  CreateCheckoutPayload,
  UpdateCheckoutPayload,
  CompleteCheckoutPayload,
} from './checkout.js';

export type { UCPSpecOrder, WebhookEvent } from './order.js';

export type {
  Product,
  Variant,
  CatalogSearchResponse,
  CatalogLookupResponse,
  SearchFilters,
  Pagination,
} from './catalog.js';

export type { Cart, CartCreatePayload, CartUpdatePayload } from './cart.js';

export type {
  OAuthServerMetadata,
  AuthorizationParams,
  TokenResponse,
  TokenExchangeParams,
  TokenRefreshParams,
  TokenRevokeParams,
} from './identity-linking.js';

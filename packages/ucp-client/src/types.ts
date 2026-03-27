import type {
  ExtendedCheckoutResponse,
  UcpDiscoveryProfile,
  CheckoutResponseStatus,
  Order,
} from '@ucp-js/sdk';

export interface UCPClientConfig {
  readonly gatewayUrl: string;
  readonly agentProfileUrl: string;
  readonly ucpVersion?: string;
  readonly requestSignature?: string;
}

export interface SearchFilters {
  readonly max_price_cents?: number;
  readonly min_price_cents?: number;
  readonly in_stock?: boolean;
  readonly category?: string;
  readonly limit?: number;
  readonly page?: number;
}

/**
 * SDK re-exports — official UCP spec types for checkout responses and discovery.
 */
export type CheckoutSession = ExtendedCheckoutResponse;
export type CheckoutSessionStatus = CheckoutResponseStatus;
export type UCPProfile = UcpDiscoveryProfile;
export type UCPSpecOrder = Order;

/**
 * Request payloads — gateway accepts partial payloads, so these are
 * more lenient than the SDK's full spec types.
 */
export interface CreateCheckoutPayload {
  readonly line_items: ReadonlyArray<{
    readonly item: { readonly id: string };
    readonly quantity: number;
  }>;
  readonly currency?: string;
  readonly buyer?: {
    readonly first_name?: string;
    readonly last_name?: string;
    readonly email?: string;
    readonly phone_number?: string;
  };
  readonly payment?: {
    readonly instruments?: readonly unknown[];
    readonly handlers?: readonly unknown[];
  };
}

export interface UpdateCheckoutPayload {
  readonly buyer?: {
    readonly first_name?: string;
    readonly last_name?: string;
    readonly email?: string;
    readonly phone_number?: string;
  };
  readonly fulfillment?: {
    readonly destinations?: ReadonlyArray<{
      readonly id: string;
      readonly address: {
        readonly street_address?: string;
        readonly address_locality?: string;
        readonly address_region?: string;
        readonly postal_code?: string;
        readonly address_country?: string;
      };
    }>;
    readonly methods?: ReadonlyArray<{
      readonly id: string;
      readonly type: string;
      readonly selected_destination_id?: string;
      readonly groups?: ReadonlyArray<{
        readonly id: string;
        readonly selected_option_id?: string;
      }>;
    }>;
  };
  readonly discounts?: {
    readonly codes?: readonly string[];
  };
  readonly context?: {
    readonly address_country?: string;
    readonly address_region?: string;
    readonly postal_code?: string;
  };
}

export interface PaymentInstrument {
  readonly id: string;
  readonly handler_id: string;
  readonly type: string;
  readonly brand?: string;
  readonly last_digits?: string;
  readonly handler_name?: string;
  readonly selected?: boolean;
  readonly credential?: {
    readonly type: string;
    readonly token?: string;
  };
  readonly billing_address?: unknown;
}

/**
 * Supports both gateway formats:
 * - `payment.instruments[]` — array of instruments
 * - `payment_data` — single instrument (official UCP spec format)
 * At least one must be provided.
 */
export interface CompleteCheckoutPayload {
  readonly payment?: {
    readonly instruments: ReadonlyArray<PaymentInstrument>;
  };
  readonly payment_data?: PaymentInstrument;
  readonly risk_signals?: Readonly<Record<string, string>>;
}

/**
 * Gateway-specific product shape — richer than SDK's ItemResponse
 * which only has { id, image_url, price, title }.
 */
export interface UCPProduct {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly price_cents: number;
  readonly currency: string;
  readonly in_stock: boolean;
  readonly stock_quantity: number;
  readonly images: readonly string[];
  readonly variants: ReadonlyArray<{
    readonly id: string;
    readonly title: string;
    readonly price_cents: number;
    readonly in_stock: boolean;
    readonly attributes: Readonly<Record<string, string>>;
  }>;
}

/**
 * Gateway-specific order shape — richer than SDK's Order
 * which uses a different structure (adjustments, fulfillment, line_items).
 */
export interface UCPOrder {
  readonly id: string;
  readonly status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'canceled';
  readonly total_cents: number;
  readonly currency: string;
  readonly created_at_iso: string;
}

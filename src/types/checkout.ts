import type { ExtendedCheckoutResponse, CheckoutResponseStatus } from '@omnixhq/ucp-js-sdk';
import type { BuyerConsent, LocalizationContext } from './common.js';
import type { PaymentInstrument } from './payment.js';

export type CheckoutSession = ExtendedCheckoutResponse;
export type CheckoutSessionStatus = CheckoutResponseStatus;

export interface CheckoutExtensions {
  readonly fulfillment: boolean;
  readonly discount: boolean;
  readonly buyerConsent: boolean;
  readonly ap2Mandate: boolean;
}

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
    readonly consent?: BuyerConsent;
  };
  readonly context?: LocalizationContext;
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
    readonly consent?: BuyerConsent;
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
      readonly line_item_ids?: readonly string[];
      readonly selected_destination_id?: string;
      readonly groups?: ReadonlyArray<{
        readonly id: string;
        readonly selected_option_id?: string;
      }>;
    }>;
  };
  readonly payment?: {
    readonly instruments?: ReadonlyArray<PaymentInstrument>;
  };
  readonly discounts?: {
    readonly codes?: readonly string[];
  };
  readonly context?: LocalizationContext;
}

export interface CompleteCheckoutPayload {
  readonly payment?: {
    readonly instruments: ReadonlyArray<PaymentInstrument>;
  };
  readonly payment_data?: PaymentInstrument;
  readonly risk_signals?: Readonly<Record<string, unknown>>;
  readonly ap2?: {
    readonly checkout_mandate?: string;
  };
}

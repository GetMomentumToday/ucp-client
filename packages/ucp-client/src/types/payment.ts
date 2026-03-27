export interface TokenCredential {
  readonly type: string;
  readonly token: string;
}

export interface CardCredential {
  readonly type: 'card';
  readonly card_number_type?: 'fpan' | 'network_token' | 'dpan';
  readonly number?: string;
  readonly expiry_month?: string;
  readonly expiry_year?: string;
  readonly name?: string;
  readonly cvc?: string;
  readonly cryptogram?: string;
  readonly eci_value?: string;
}

export type PaymentCredential = TokenCredential | CardCredential;

import type { PostalAddress } from './common.js';

export interface PaymentInstrument {
  readonly id: string;
  readonly handler_id: string;
  readonly type: string;
  readonly brand?: string;
  readonly last_digits?: string;
  readonly handler_name?: string;
  readonly selected?: boolean;
  readonly display?: Readonly<Record<string, unknown>>;
  readonly credential?: PaymentCredential;
  readonly billing_address?: PostalAddress;
}

export interface PaymentHandlerInstance {
  readonly id: string;
  readonly version: string;
  readonly spec: string;
  readonly schema: string;
  readonly config?: Readonly<Record<string, unknown>>;
}

export interface PaymentHandlerMap {
  readonly [namespace: string]: readonly PaymentHandlerInstance[];
}

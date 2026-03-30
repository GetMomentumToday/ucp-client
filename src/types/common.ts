export interface PostalAddress {
  readonly first_name?: string;
  readonly last_name?: string;
  readonly street_address?: string;
  readonly extended_address?: string;
  readonly address_locality?: string;
  readonly address_region?: string;
  readonly address_country?: string;
  readonly postal_code?: string;
  readonly phone_number?: string;
}

export interface BuyerConsent {
  readonly analytics?: boolean;
  readonly preferences?: boolean;
  readonly marketing?: boolean;
  readonly sale_of_data?: boolean;
}

export interface LocalizationContext {
  readonly address_country?: string;
  readonly address_region?: string;
  readonly postal_code?: string;
}

/**
 * A JSON Web Key (RFC 7517).
 * Extends the TypeScript stdlib `JsonWebKey` with the `kid` claim required by UCP for webhook
 * signature verification (the stdlib definition omits `kid`).
 */
export type JWK = JsonWebKey & { readonly kid?: string };

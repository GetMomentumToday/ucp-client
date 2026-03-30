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

/** A JSON Web Key (RFC 7517). Used for webhook signature verification. */
export interface JWK {
  readonly kty: string;
  readonly kid?: string;
  readonly use?: string;
  readonly alg?: string;
  readonly crv?: string;
  readonly x?: string;
  readonly y?: string;
  readonly [key: string]: unknown;
}

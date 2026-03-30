import { z } from 'zod';
import type { UcpDiscoveryProfile } from '@omnixhq/ucp-js-sdk';
import { HttpClient } from './http.js';
import type { LogFn } from './http.js';
import { UCPProfileSchema } from './schemas.js';
import { CheckoutCapability } from './capabilities/checkout.js';
import { OrderCapability } from './capabilities/order.js';
import { IdentityLinkingCapability } from './capabilities/identity-linking.js';
import type { UCPClientConfig } from './types/config.js';
import { DEFAULT_UCP_VERSION, UCP_CAPABILITIES } from './types/config.js';
import type { CheckoutExtensions } from './types/checkout.js';
import type { OAuthServerMetadata } from './types/identity-linking.js';
import type { PaymentHandlerMap } from './types/payment.js';
import { getAgentTools } from './agent-tools.js';
import type { AgentTool } from './agent-tools.js';

/** UCP discovery profile returned by `GET /.well-known/ucp`. */
export type UCPProfile = UcpDiscoveryProfile;

/** Describes a single tool the agent can use with the connected server. */
export interface ToolDescriptor {
  readonly name: string;
  readonly capability: string;
  readonly description: string;
}

/**
 * A connected UCP client. Only capabilities the server declared are non-null.
 * Use `describeTools()` to get the list of available tools for agent registration.
 */
export interface ConnectedClient {
  /** The server's UCP discovery profile. */
  readonly profile: UCPProfile;
  /** Checkout operations. Null if server does not support `dev.ucp.shopping.checkout`. */
  readonly checkout: CheckoutCapability | null;
  /** Order operations. Null if server does not support `dev.ucp.shopping.order`. */
  readonly order: OrderCapability | null;
  /** OAuth 2.0 identity linking. Null if server does not support `dev.ucp.common.identity_linking`. */
  readonly identityLinking: IdentityLinkingCapability | null;
  /** Payment handlers declared by the server, keyed by namespace. */
  readonly paymentHandlers: PaymentHandlerMap;
  /** Returns only the tools this server supports (name + description only). */
  describeTools(): readonly ToolDescriptor[];
  /**
   * Returns complete tool definitions with JSON Schema parameters and execute functions.
   * Ready for direct use with any AI agent framework (Claude API, OpenAI, Vercel AI SDK, LangChain, MCP).
   */
  getAgentTools(): readonly AgentTool[];
}

/**
 * Connect to a UCP server, discover its capabilities, and return a {@link ConnectedClient}.
 *
 * @example
 * ```typescript
 * const client = await connect({
 *   gatewayUrl: 'https://store.example.com/ucp',
 *   agentProfileUrl: 'https://platform.example.com/.well-known/ucp',
 * });
 *
 * if (client.checkout) {
 *   const session = await client.checkout.create({ line_items: [...] });
 * }
 * ```
 */
export async function connect(
  config: UCPClientConfig,
  options?: { readonly onValidationWarning?: LogFn },
): Promise<ConnectedClient> {
  validateConfig(config);

  const http = new HttpClient({
    gatewayUrl: config.gatewayUrl.replace(/\/+$/, ''),
    agentProfileUrl: config.agentProfileUrl,
    ucpVersion: config.ucpVersion ?? DEFAULT_UCP_VERSION,
    ...(config.requestSignature !== undefined ? { requestSignature: config.requestSignature } : {}),
    ...(options?.onValidationWarning !== undefined
      ? { onValidationWarning: options.onValidationWarning }
      : {}),
  });

  const rawProfile = await http.request('GET', '/.well-known/ucp');
  const profile = http.validate(rawProfile, UCPProfileSchema);
  const capabilityNames = extractCapabilityNames(profile);

  const checkout = buildCheckoutCapability(http, capabilityNames);
  const order = capabilityNames.has(UCP_CAPABILITIES.ORDER) ? new OrderCapability(http) : null;
  const identityLinking = await buildIdentityLinking(config, capabilityNames);
  const paymentHandlers = extractPaymentHandlers(profile);

  const client: ConnectedClient = {
    profile,
    checkout,
    order,
    identityLinking,
    paymentHandlers,
    describeTools: () => buildToolDescriptors(checkout, order, identityLinking),
    getAgentTools: () => getAgentTools(client),
  };

  return Object.freeze(client);
}

/**
 * UCP client entry point. Use `UCPClient.connect()` to discover server capabilities
 * and get a {@link ConnectedClient}.
 *
 * @example
 * ```typescript
 * const client = await UCPClient.connect({
 *   gatewayUrl: 'https://store.example.com/ucp',
 *   agentProfileUrl: 'https://platform.example.com/.well-known/ucp',
 * });
 * ```
 */
export class UCPClient {
  private constructor() {
    /* use UCPClient.connect() or the standalone connect() function */
  }

  static connect = connect;
}

function validateConfig(config: UCPClientConfig): void {
  new URL(config.gatewayUrl);
  if (config.agentProfileUrl.includes('"') || config.agentProfileUrl.includes('\n')) {
    throw new Error('agentProfileUrl must not contain double quotes or newlines');
  }
  new URL(config.agentProfileUrl);
}

function extractCapabilityNames(profile: UCPProfile): Set<string> {
  const capabilities = profile.ucp?.capabilities;
  if (typeof capabilities !== 'object' || capabilities === null) return new Set();
  return new Set(Object.keys(capabilities));
}

const PaymentHandlerInstanceSchema = z
  .object({
    id: z.string(),
    version: z.string(),
    spec: z.string(),
    schema: z.string(),
    config: z.record(z.unknown()).optional(),
  })
  .passthrough();

const PaymentHandlerMapSchema = z.record(z.array(PaymentHandlerInstanceSchema));

function extractPaymentHandlers(profile: UCPProfile): PaymentHandlerMap {
  const raw = (profile as Record<string, unknown>)['payment_handlers'];
  if (typeof raw !== 'object' || raw === null) return {};
  const result = PaymentHandlerMapSchema.safeParse(raw);
  if (!result.success) return {};
  return result.data as PaymentHandlerMap;
}

function buildCheckoutCapability(
  http: HttpClient,
  capabilityNames: Set<string>,
): CheckoutCapability | null {
  if (!capabilityNames.has(UCP_CAPABILITIES.CHECKOUT)) return null;

  const extensions: CheckoutExtensions = {
    fulfillment: capabilityNames.has(UCP_CAPABILITIES.FULFILLMENT),
    discount: capabilityNames.has(UCP_CAPABILITIES.DISCOUNT),
    buyerConsent: capabilityNames.has(UCP_CAPABILITIES.BUYER_CONSENT),
    ap2Mandate: capabilityNames.has(UCP_CAPABILITIES.AP2_MANDATE),
  };

  return new CheckoutCapability(http, extensions);
}

const OAuthServerMetadataSchema = z
  .object({
    issuer: z.string(),
    authorization_endpoint: z.string().url(),
    token_endpoint: z.string().url(),
    revocation_endpoint: z.string().url(),
    scopes_supported: z.array(z.string()),
    response_types_supported: z.array(z.string()),
    grant_types_supported: z.array(z.string()),
    token_endpoint_auth_methods_supported: z.array(z.string()),
    service_documentation: z.string().url().optional(),
  })
  .passthrough();

async function buildIdentityLinking(
  config: UCPClientConfig,
  capabilityNames: Set<string>,
): Promise<IdentityLinkingCapability | null> {
  if (!capabilityNames.has(UCP_CAPABILITIES.IDENTITY_LINKING)) return null;

  const gatewayUrl = config.gatewayUrl.replace(/\/+$/, '');
  const metadataUrl = `${gatewayUrl}/.well-known/oauth-authorization-server`;
  const res = await fetch(metadataUrl);

  if (!res.ok) {
    throw new Error(
      `Identity linking capability declared but OAuth metadata fetch failed: ${res.status} from ${metadataUrl}`,
    );
  }

  const raw: unknown = await res.json();
  const parsed = OAuthServerMetadataSchema.safeParse(raw);

  if (!parsed.success) {
    throw new Error(`Identity linking OAuth metadata validation failed: ${parsed.error.message}`);
  }

  return new IdentityLinkingCapability(parsed.data as OAuthServerMetadata);
}

function buildToolDescriptors(
  checkout: CheckoutCapability | null,
  order: OrderCapability | null,
  identityLinking: IdentityLinkingCapability | null,
): readonly ToolDescriptor[] {
  const tools: ToolDescriptor[] = [];

  if (checkout) {
    tools.push(
      {
        name: 'create_checkout',
        capability: 'checkout',
        description: 'Create a checkout session',
      },
      {
        name: 'get_checkout',
        capability: 'checkout',
        description: 'Get checkout session by ID',
      },
      {
        name: 'update_checkout',
        capability: 'checkout',
        description: 'Update a checkout session',
      },
      {
        name: 'complete_checkout',
        capability: 'checkout',
        description: 'Complete checkout with payment',
      },
      {
        name: 'cancel_checkout',
        capability: 'checkout',
        description: 'Cancel a checkout session',
      },
    );

    if (checkout.extensions.fulfillment) {
      tools.push(
        {
          name: 'set_fulfillment',
          capability: 'checkout.fulfillment',
          description: 'Set fulfillment method (shipping/pickup)',
        },
        {
          name: 'select_destination',
          capability: 'checkout.fulfillment',
          description: 'Select shipping destination',
        },
        {
          name: 'select_fulfillment_option',
          capability: 'checkout.fulfillment',
          description: 'Select fulfillment option (e.g., express shipping)',
        },
      );
    }

    if (checkout.extensions.discount) {
      tools.push({
        name: 'apply_discount_codes',
        capability: 'checkout.discount',
        description: 'Apply discount codes to checkout',
      });
    }
  }

  if (order) {
    tools.push(
      {
        name: 'get_order',
        capability: 'order',
        description: 'Get order by ID',
      },
      {
        name: 'update_order',
        capability: 'order',
        description: 'Update an order',
      },
    );
  }

  if (identityLinking) {
    tools.push(
      {
        name: 'get_authorization_url',
        capability: 'identity_linking',
        description: 'Get OAuth authorization URL for account linking',
      },
      {
        name: 'exchange_auth_code',
        capability: 'identity_linking',
        description: 'Exchange authorization code for access token',
      },
      {
        name: 'refresh_access_token',
        capability: 'identity_linking',
        description: 'Refresh an expired access token',
      },
      {
        name: 'revoke_token',
        capability: 'identity_linking',
        description: 'Revoke an access or refresh token',
      },
    );
  }

  return tools;
}

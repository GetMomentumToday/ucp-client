import type { ConnectedClient } from './UCPClient.js';

/** JSON Schema type subset used for tool parameter definitions. */
export interface JsonSchema {
  readonly type: string;
  readonly properties?: Readonly<Record<string, JsonSchema>>;
  readonly required?: readonly string[];
  readonly items?: JsonSchema;
  readonly enum?: readonly string[];
  readonly description?: string;
  readonly default?: unknown;
}

/**
 * A complete tool definition ready for any AI agent framework.
 * Contains everything an LLM needs: name, description, parameter schema, and executor.
 */
export interface AgentTool {
  readonly name: string;
  readonly description: string;
  readonly parameters: JsonSchema;
  readonly execute: (params: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Returns ready-to-use tool definitions for agent registration.
 * Only tools supported by the connected server are included.
 *
 * Each tool has:
 * - `name` — unique tool identifier
 * - `description` — what the tool does (for the LLM)
 * - `parameters` — JSON Schema describing the expected input
 * - `execute(params)` — function that calls the right capability method
 *
 * @example
 * ```typescript
 * const client = await UCPClient.connect(config);
 * const tools = getAgentTools(client);
 *
 * // Register with Anthropic Claude API
 * const response = await anthropic.messages.create({
 *   tools: tools.map(t => ({
 *     name: t.name,
 *     description: t.description,
 *     input_schema: t.parameters,
 *   })),
 *   // ...
 * });
 *
 * // Execute tool calls
 * for (const block of response.content) {
 *   if (block.type === 'tool_use') {
 *     const tool = tools.find(t => t.name === block.name);
 *     const result = await tool.execute(block.input);
 *   }
 * }
 * ```
 */
export function getAgentTools(client: ConnectedClient): readonly AgentTool[] {
  const tools: AgentTool[] = [];

  if (client.checkout) {
    tools.push(...checkoutTools(client));

    if (client.checkout.extensions.fulfillment) {
      tools.push(...fulfillmentTools(client));
    }

    if (client.checkout.extensions.discount) {
      tools.push(...discountTools(client));
    }
  }

  if (client.order) {
    tools.push(...orderTools(client));
  }

  if (client.identityLinking) {
    tools.push(...identityLinkingTools(client));
  }

  return tools;
}

function checkoutTools(client: ConnectedClient): AgentTool[] {
  return [
    {
      name: 'create_checkout',
      description:
        'Create a new checkout session with line items. Returns a session with an ID to use in subsequent calls.',
      parameters: {
        type: 'object',
        properties: {
          line_items: {
            type: 'array',
            description: 'Products to purchase',
            items: {
              type: 'object',
              properties: {
                item: {
                  type: 'object',
                  properties: { id: { type: 'string', description: 'Product ID' } },
                  required: ['id'],
                },
                quantity: { type: 'number', description: 'Quantity to purchase' },
              },
              required: ['item', 'quantity'],
            },
          },
          currency: { type: 'string', description: 'ISO 4217 currency code (e.g., "USD")' },
        },
        required: ['line_items'],
      },
      execute: async (params) =>
        client.checkout!.create(
          params as unknown as Parameters<NonNullable<typeof client.checkout>['create']>[0],
        ),
    },
    {
      name: 'get_checkout',
      description:
        'Get the current state of a checkout session, including status, totals, and available options.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Checkout session ID' },
        },
        required: ['id'],
      },
      execute: async (params) => client.checkout!.get(params['id'] as string),
    },
    {
      name: 'update_checkout',
      description:
        'Update a checkout session with buyer information, shipping address, or payment details.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Checkout session ID' },
          buyer: {
            type: 'object',
            description: 'Buyer contact information',
            properties: {
              first_name: { type: 'string' },
              last_name: { type: 'string' },
              email: { type: 'string' },
              phone_number: { type: 'string' },
            },
          },
          context: {
            type: 'object',
            description: 'Localization context for pricing and availability',
            properties: {
              address_country: { type: 'string', description: 'ISO 3166-1 alpha-2 country code' },
              address_region: { type: 'string', description: 'State or province' },
              postal_code: { type: 'string' },
            },
          },
        },
        required: ['id'],
      },
      execute: async (params) => {
        const { id, ...patch } = params as { id: string; [key: string]: unknown };
        return client.checkout!.update(id, patch);
      },
    },
    {
      name: 'complete_checkout',
      description:
        'Complete a checkout session with payment. Places the order. Returns the completed session with order ID.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Checkout session ID' },
          payment: {
            type: 'object',
            description: 'Payment information',
            properties: {
              instruments: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', description: 'Instrument ID' },
                    handler_id: {
                      type: 'string',
                      description: 'Payment handler ID from the server profile',
                    },
                    type: { type: 'string', description: 'Payment type (e.g., "card", "offline")' },
                    credential: {
                      type: 'object',
                      properties: {
                        type: { type: 'string', description: 'Credential type (e.g., "token")' },
                        token: { type: 'string', description: 'Payment token' },
                      },
                      required: ['type'],
                    },
                  },
                  required: ['id', 'handler_id', 'type'],
                },
              },
            },
            required: ['instruments'],
          },
        },
        required: ['id', 'payment'],
      },
      execute: async (params) => {
        const { id, ...payload } = params;
        return client.checkout!.complete(
          String(id),
          payload as unknown as Parameters<NonNullable<typeof client.checkout>['complete']>[1],
        );
      },
    },
    {
      name: 'cancel_checkout',
      description: 'Cancel a checkout session. The session cannot be used after cancellation.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Checkout session ID' },
        },
        required: ['id'],
      },
      execute: async (params) => client.checkout!.cancel(params['id'] as string),
    },
  ];
}

function fulfillmentTools(client: ConnectedClient): AgentTool[] {
  return [
    {
      name: 'set_fulfillment',
      description: 'Set the fulfillment method for a checkout (e.g., "shipping" or "pickup").',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Checkout session ID' },
          type: { type: 'string', enum: ['shipping', 'pickup'], description: 'Fulfillment method' },
        },
        required: ['id', 'type'],
      },
      execute: async (params) =>
        client.checkout!.setFulfillment(params['id'] as string, params['type'] as string),
    },
    {
      name: 'select_destination',
      description: 'Select a shipping destination for a checkout session.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Checkout session ID' },
          destination_id: { type: 'string', description: 'Destination ID to select' },
          fulfillment_type: {
            type: 'string',
            default: 'shipping',
            description: 'Fulfillment type',
          },
        },
        required: ['id', 'destination_id'],
      },
      execute: async (params) =>
        client.checkout!.selectDestination(
          params['id'] as string,
          params['destination_id'] as string,
          (params['fulfillment_type'] as string) ?? 'shipping',
        ),
    },
    {
      name: 'select_fulfillment_option',
      description:
        'Select a fulfillment option (e.g., standard shipping, express shipping) for a checkout session.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Checkout session ID' },
          option_id: { type: 'string', description: 'Fulfillment option ID to select' },
          destination_id: { type: 'string', description: 'Destination ID (if applicable)' },
          fulfillment_type: {
            type: 'string',
            default: 'shipping',
            description: 'Fulfillment type',
          },
        },
        required: ['id', 'option_id'],
      },
      execute: async (params) =>
        client.checkout!.selectFulfillmentOption(
          params['id'] as string,
          params['option_id'] as string,
          params['destination_id'] as string | undefined,
          (params['fulfillment_type'] as string) ?? 'shipping',
        ),
    },
  ];
}

function discountTools(client: ConnectedClient): AgentTool[] {
  return [
    {
      name: 'apply_discount_codes',
      description: 'Apply one or more discount codes to a checkout session.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Checkout session ID' },
          codes: {
            type: 'array',
            items: { type: 'string' },
            description: 'Discount codes to apply',
          },
        },
        required: ['id', 'codes'],
      },
      execute: async (params) =>
        client.checkout!.applyDiscountCodes(params['id'] as string, params['codes'] as string[]),
    },
  ];
}

function orderTools(client: ConnectedClient): AgentTool[] {
  return [
    {
      name: 'get_order',
      description:
        'Get order details by ID, including line items, fulfillment status, and tracking information.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Order ID' },
        },
        required: ['id'],
      },
      execute: async (params) => client.order!.get(params['id'] as string),
    },
    {
      name: 'update_order',
      description: 'Update an order with fulfillment events, adjustments, or status changes.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Order ID' },
          fulfillment: {
            type: 'object',
            description: 'Fulfillment update data (events, tracking)',
          },
          adjustments: {
            type: 'array',
            description: 'Order adjustments (refunds, returns)',
            items: { type: 'object' },
          },
        },
        required: ['id'],
      },
      execute: async (params) => {
        const { id, ...payload } = params as { id: string; [key: string]: unknown };
        return client.order!.update(id, payload);
      },
    },
  ];
}

function identityLinkingTools(client: ConnectedClient): AgentTool[] {
  return [
    {
      name: 'get_authorization_url',
      description:
        'Build the OAuth authorization URL to redirect the buyer to for account linking. Returns a URL string.',
      parameters: {
        type: 'object',
        properties: {
          client_id: { type: 'string', description: 'OAuth client ID' },
          redirect_uri: { type: 'string', description: 'URI to redirect to after authorization' },
          scope: {
            type: 'string',
            description: 'OAuth scope (default: ucp:scopes:checkout_session)',
          },
          state: { type: 'string', description: 'Opaque value for CSRF protection' },
        },
        required: ['client_id', 'redirect_uri'],
      },
      execute: (params) =>
        Promise.resolve(
          client.identityLinking!.getAuthorizationUrl(
            params as unknown as Parameters<
              NonNullable<typeof client.identityLinking>['getAuthorizationUrl']
            >[0],
          ),
        ),
    },
    {
      name: 'exchange_auth_code',
      description: 'Exchange an OAuth authorization code for an access token and refresh token.',
      parameters: {
        type: 'object',
        properties: {
          client_id: { type: 'string', description: 'OAuth client ID' },
          client_secret: { type: 'string', description: 'OAuth client secret' },
          code: { type: 'string', description: 'Authorization code from the redirect' },
          redirect_uri: {
            type: 'string',
            description: 'Must match the redirect_uri used in authorization',
          },
        },
        required: ['client_id', 'client_secret', 'code', 'redirect_uri'],
      },
      execute: async (params) =>
        client.identityLinking!.exchangeCode(
          params as unknown as Parameters<
            NonNullable<typeof client.identityLinking>['exchangeCode']
          >[0],
        ),
    },
    {
      name: 'refresh_access_token',
      description: 'Refresh an expired access token using a refresh token.',
      parameters: {
        type: 'object',
        properties: {
          client_id: { type: 'string', description: 'OAuth client ID' },
          client_secret: { type: 'string', description: 'OAuth client secret' },
          refresh_token: { type: 'string', description: 'Refresh token from a previous exchange' },
        },
        required: ['client_id', 'client_secret', 'refresh_token'],
      },
      execute: async (params) =>
        client.identityLinking!.refreshToken(
          params as unknown as Parameters<
            NonNullable<typeof client.identityLinking>['refreshToken']
          >[0],
        ),
    },
    {
      name: 'revoke_token',
      description: 'Revoke an access or refresh token to invalidate an account link.',
      parameters: {
        type: 'object',
        properties: {
          client_id: { type: 'string', description: 'OAuth client ID' },
          client_secret: { type: 'string', description: 'OAuth client secret' },
          token: { type: 'string', description: 'Token to revoke' },
          token_type_hint: {
            type: 'string',
            enum: ['access_token', 'refresh_token'],
            description: 'Hint about the token type',
          },
        },
        required: ['client_id', 'client_secret', 'token'],
      },
      execute: async (params) =>
        client.identityLinking!.revokeToken(
          params as unknown as Parameters<
            NonNullable<typeof client.identityLinking>['revokeToken']
          >[0],
        ),
    },
  ];
}

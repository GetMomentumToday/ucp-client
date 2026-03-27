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

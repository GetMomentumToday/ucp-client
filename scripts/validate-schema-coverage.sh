#!/usr/bin/env bash
set -euo pipefail

##
# Schema Coverage Check
#
# Verifies that every public UCPClient method that returns data
# has a corresponding Zod schema validation call, and that all
# required response/request schemas are exported.
#
# Exit code: 0 = all covered, 1 = gaps found
##

SRC="packages/ucp-client/src/UCPClient.ts"
SCHEMA_FILE="packages/ucp-client/src/schemas.ts"

if [ ! -f "$SRC" ]; then
  echo "ERROR: $SRC not found"
  exit 2
fi

GAPS=0

echo "=== Schema Coverage Check ==="
echo ""

# Extract public method names (lines like "  async methodName(")
METHODS=$(grep -oE '^\s+async\s+[a-zA-Z]+\(' "$SRC" | grep -oE '[a-zA-Z]+\(' | sed 's/($//')

echo "--- Method validation coverage ---"
for method in $METHODS; do
  # Count validate calls in the method body (between this method and the next async/private)
  HAS_VALIDATE=$(awk "/async ${method}\(/,/^\s+(async|private)\s/" "$SRC" | grep -c 'this\.validate\|this\.validateCheckout\|this\.updateCheckout\|this\.request' || true)

  if [ "$HAS_VALIDATE" -gt 0 ]; then
    echo "  ✅ ${method}()"
  else
    echo "  ❌ ${method}() — NO schema validation"
    GAPS=$((GAPS + 1))
  fi
done

echo ""
echo "--- Response schemas ---"

RESPONSE_SCHEMAS=("CheckoutSessionSchema" "UCPProfileSchema" "UCPProductSchema" "UCPOrderSchema")
for schema in "${RESPONSE_SCHEMAS[@]}"; do
  if grep -q "export const ${schema}" "$SCHEMA_FILE" 2>/dev/null; then
    echo "  ✅ ${schema}"
  else
    echo "  ❌ ${schema} — MISSING"
    GAPS=$((GAPS + 1))
  fi
done

echo ""
echo "--- Request schemas ---"

REQUEST_SCHEMAS=("CreateCheckoutRequestSchema" "UpdateCheckoutRequestSchema" "CompleteCheckoutRequestSchema")
for schema in "${REQUEST_SCHEMAS[@]}"; do
  if grep -q "${schema}" "$SCHEMA_FILE" 2>/dev/null; then
    echo "  ✅ ${schema}"
  else
    echo "  ❌ ${schema} — MISSING"
    GAPS=$((GAPS + 1))
  fi
done

echo ""
echo "--- SDK sub-entity re-exports ---"

SDK_SCHEMAS=("BuyerSchema" "PostalAddressSchema" "TotalResponseSchema" "MessageSchema" "PaymentResponseSchema" "PaymentHandlerResponseSchema" "FulfillmentResponseSchema" "LineItemResponseSchema" "CheckoutResponseStatusSchema")
SDK_COUNT=0
for schema in "${SDK_SCHEMAS[@]}"; do
  if grep -q "${schema}" "$SCHEMA_FILE" 2>/dev/null; then
    SDK_COUNT=$((SDK_COUNT + 1))
  else
    echo "  ⚠️  ${schema} — not re-exported"
  fi
done
echo "  ${SDK_COUNT}/${#SDK_SCHEMAS[@]} SDK schemas re-exported"

echo ""

if [ "$GAPS" -gt 0 ]; then
  echo "❌ ${GAPS} schema coverage gap(s) found"
  exit 1
fi

echo "✅ All methods and response types have schema coverage"

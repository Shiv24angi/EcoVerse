/**
 * Request ID utilities for distributed tracing (Issue #461).
 *
 * Every request gets a stable, machine-readable identifier that is:
 *   - propagated downstream to API route handlers via the `x-request-id`
 *     request header, so logs inside a handler can be correlated, and
 *   - returned to clients in the `X-Request-Id` response header.
 *
 * Inbound `x-request-id` values from an upstream gateway are adopted
 * (when well-formed) so traces stay continuous across services; otherwise a
 * fresh UUID is generated. Header format is RFC 7231-friendly (token chars
 * only) so it is safe to echo back on the response.
 */

const REQUEST_ID_MAX_LENGTH = 64;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]+$/;

/**
 * Generates a fresh, universally unique request ID.
 * Uses the Web Crypto API available in both Node.js (>= 19) and the Edge
 * runtime used by Next.js middleware.
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Resolves the request ID for this request.
 *
 * Adopts a well-formed inbound `x-request-id` (for cross-service trace
 * continuity) and falls back to generating a new one otherwise. The value is
 * trimmed and validated to be a safe HTTP token so it can be echoed on the
 * response without header-injection risk.
 *
 * @param incoming - Raw value of the inbound `x-request-id` header, if any.
 */
export function resolveRequestId(incoming: string | null | undefined): string {
  const trimmed = incoming?.trim();
  if (
    trimmed &&
    trimmed.length <= REQUEST_ID_MAX_LENGTH &&
    REQUEST_ID_PATTERN.test(trimmed)
  ) {
    return trimmed;
  }
  return generateRequestId();
}

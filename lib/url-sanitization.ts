/**
 * URL Sanitization Utilities
 * Prevents IP leak and tracking via third-party image URLs
 */

// Trusted domains for product images (Open Food Facts CDN)
const TRUSTED_IMAGE_DOMAINS = [
  'images.openfoodfacts.org',
  'world.openfoodfacts.org',
  'static.openfoodfacts.org',
  'cdn.openfoodfacts.org',
];

/**
 * Validates if a URL is from a trusted domain
 * Only allows HTTPS URLs from Open Food Facts CDN
 */
export function isTrustedImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);

    // Only allow HTTPS
    if (parsed.protocol !== 'https:') return false;

    // Check if hostname ends with a trusted domain
    const hostname = parsed.hostname.toLowerCase();
    return TRUSTED_IMAGE_DOMAINS.some(
      (trusted) => hostname === trusted || hostname.endsWith(`.${trusted}`)
    );
  } catch {
    // Invalid URL
    return false;
  }
}

/**
 * Sanitizes an image URL to prevent IP leak and tracking
 * Returns null if URL is not from a trusted source
 */
export function sanitizeProductImageUrl(
  url: string | null | undefined
): string | null {
  if (!url) return null;

  // Only return URLs from trusted domains
  if (isTrustedImageUrl(url)) {
    return url;
  }

  // Log suspicious URL attempt (without exposing the URL)
  console.warn('Blocked potentially malicious image URL from untrusted domain');
  return null;
}

/**
 * Strips referrer information from a URL for privacy
 * Used for analytics/tracking prevention
 */
export function stripReferrer(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove any tracking parameters
    parsed.searchParams.delete('utm_source');
    parsed.searchParams.delete('utm_medium');
    parsed.searchParams.delete('utm_campaign');
    parsed.searchParams.delete('ref');
    return parsed.toString();
  } catch {
    return url;
  }
}

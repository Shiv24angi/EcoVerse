/**
 * Product image URL sanitization.
 *
 * Open Food Facts image fields (`image_front_url`, `image_url`,
 * `image_front_small_url`) are user-contributed and untrusted: an attacker
 * can point them at an arbitrary host. Before any such URL reaches the
 * browser, it must pass a strict allowlist (Issue #422):
 *   - scheme must be HTTPS, and
 *   - hostname must be `openfoodfacts.org` (or a subdomain of it, e.g.
 *     `images.openfoodfacts.org`).
 */

const PRODUCT_IMAGE_ALLOWED_HOST = 'openfoodfacts.org';

export function isAllowedProductImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    return (
      host === PRODUCT_IMAGE_ALLOWED_HOST ||
      host.endsWith(`.${PRODUCT_IMAGE_ALLOWED_HOST}`)
    );
  } catch {
    return false;
  }
}

/**
 * Returns the first image URL that is safe to render, or null if none of the
 * provided values pass the allowlist. Mirrors the OFF preference order used
 * by the scan route (front -> full -> small).
 */
export function sanitizeProductImage(
  imageFrontUrl?: string | null,
  imageUrl?: string | null,
  imageFrontSmallUrl?: string | null
): string | null {
  for (const candidate of [imageFrontUrl, imageUrl, imageFrontSmallUrl]) {
    if (candidate && isAllowedProductImageUrl(candidate)) {
      return candidate;
    }
  }
  return null;
}

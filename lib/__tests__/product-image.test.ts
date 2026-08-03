import {
  isAllowedProductImageUrl,
  sanitizeProductImage,
} from '../product-image';

describe('sanitizeProductImage', () => {
  it('returns null when a tampered OFF record points at an arbitrary host (Issue #422)', () => {
    expect(sanitizeProductImage('http://evil.example/track.gif')).toBeNull();
  });

  it('rejects plain-HTTP openfoodfacts URLs', () => {
    expect(
      sanitizeProductImage('http://images.openfoodfacts.org/foo.jpg')
    ).toBeNull();
  });

  it('rejects hostnames that merely contain openfoodfacts.org', () => {
    expect(
      sanitizeProductImage('https://evilopenfoodfacts.org/track.gif')
    ).toBeNull();
    expect(
      sanitizeProductImage('https://openfoodfacts.org.evil.example/track.gif')
    ).toBeNull();
  });

  it('rejects non-http schemes (javascript:, data:)', () => {
    expect(sanitizeProductImage('javascript:alert(1)')).toBeNull();
    expect(
      sanitizeProductImage('data:text/html;base64,PHNjcmlwdD4=')
    ).toBeNull();
  });

  it('rejects relative or malformed URLs', () => {
    expect(sanitizeProductImage('/images/foo.jpg')).toBeNull();
    expect(sanitizeProductImage('not a url')).toBeNull();
  });

  it('accepts HTTPS URLs on images.openfoodfacts.org', () => {
    expect(
      sanitizeProductImage('https://images.openfoodfacts.org/foo.jpg')
    ).toBe('https://images.openfoodfacts.org/foo.jpg');
  });

  it('accepts the apex openfoodfacts.org host over HTTPS', () => {
    expect(sanitizeProductImage('https://openfoodfacts.org/foo.jpg')).toBe(
      'https://openfoodfacts.org/foo.jpg'
    );
  });

  it('skips invalid candidates and falls back to the next allowed one', () => {
    expect(
      sanitizeProductImage(
        'http://evil.example/track.gif',
        'https://images.openfoodfacts.org/ok.jpg',
        'https://static.openfoodfacts.org/small.jpg'
      )
    ).toBe('https://images.openfoodfacts.org/ok.jpg');
  });

  it('returns null when every candidate is rejected', () => {
    expect(
      sanitizeProductImage(
        'http://evil.example/a.gif',
        'https://evil.example/b.gif',
        'https://evil.example/c.gif'
      )
    ).toBeNull();
  });
});

describe('isAllowedProductImageUrl', () => {
  it('validates allowlist membership', () => {
    expect(
      isAllowedProductImageUrl('https://images.openfoodfacts.org/x.png')
    ).toBe(true);
    expect(
      isAllowedProductImageUrl('http://images.openfoodfacts.org/x.png')
    ).toBe(false);
    expect(isAllowedProductImageUrl('https://evil.example/x.png')).toBe(false);
  });
});

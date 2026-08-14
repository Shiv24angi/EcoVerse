import {
  validateBarcode,
  validateSearchQuery,
  validateBarcodeFormat,
  validateIntegerParameter,
  ValidationLimits,
} from '../input-validation';

/**
 * Tests for input validation utility (Issue #409)
 * Verifies that unbounded query strings are prevented
 * and barcode/query inputs are properly validated
 */

describe('Input Validation Utility (Issue #409)', () => {
  describe('validateBarcode', () => {
    it('should accept valid barcodes', () => {
      const result = validateBarcode('5012345678905');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('5012345678905');
    });

    it('should accept barcodes with allowed characters', () => {
      const testCases = [
        '123456789012',
        '123-456-789',
        '123+456',
        '123.456',
        '123/456',
        '123:456',
        '123%456',
        'ABC123DEF456',
        'abc123def456',
      ];

      testCases.forEach((barcode) => {
        const result = validateBarcode(barcode);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject barcodes exceeding max length', () => {
      const longBarcode = 'a'.repeat(ValidationLimits.BARCODE_MAX + 1);
      const result = validateBarcode(longBarcode);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot exceed');
    });

    it('should reject empty barcodes', () => {
      const result = validateBarcode('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });

    it('should reject barcodes with invalid characters', () => {
      const invalidBarcodes = [
        '123@456', // @ not allowed
        '123#456', // # not allowed
        '123$456', // $ not allowed
        '123&456', // & not allowed
      ];

      invalidBarcodes.forEach((barcode) => {
        const result = validateBarcode(barcode);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('invalid characters');
      });
    });

    it('should trim whitespace from barcodes', () => {
      const result = validateBarcode('  123456  ');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('123456');
    });

    it('should reject non-string input', () => {
      const result = validateBarcode(123456);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be a string');
    });
  });

  describe('validateSearchQuery', () => {
    it('should accept valid search queries', () => {
      const result = validateSearchQuery('milk');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('milk');
    });

    it('should accept long valid queries', () => {
      const longQuery = 'sustainable organic almond milk from california farms';
      const result = validateSearchQuery(longQuery);
      expect(result.valid).toBe(true);
    });

    it('should reject queries below minimum length', () => {
      const result = validateSearchQuery('a');
      expect(result.valid).toBe(false);
      expect(result.error).toContain(`at least ${ValidationLimits.QUERY_MIN}`);
    });

    it('should reject queries exceeding max length', () => {
      const longQuery = 'a'.repeat(ValidationLimits.QUERY_MAX + 1);
      const result = validateSearchQuery(longQuery);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot exceed');
    });

    it('should trim whitespace from queries', () => {
      const result = validateSearchQuery('  milk  ');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('milk');
    });

    it('should reject non-string input', () => {
      const result = validateSearchQuery(12345);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be a string');
    });
  });

  describe('validateBarcodeFormat', () => {
    it('should accept standard EAN/UPC formats', () => {
      const validBarcodes = [
        '5012345678905', // EAN-13
        '12345678', // EAN-8
        '123456789012', // UPC-A
        'ABC123', // Non-numeric formats allowed
      ];

      validBarcodes.forEach((barcode) => {
        const result = validateBarcodeFormat(barcode);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject numeric-only barcodes outside 8-14 range', () => {
      const result = validateBarcodeFormat('1234567'); // 7 digits - too short
      expect(result.valid).toBe(false);
    });

    it('should reject very long numeric barcodes', () => {
      const result = validateBarcodeFormat('123456789012345'); // 15 digits - too long
      expect(result.valid).toBe(false);
    });
  });

  describe('validateIntegerParameter', () => {
    it('should parse and validate valid integers', () => {
      const result = validateIntegerParameter(5, 'limit', { min: 1, max: 100 });
      expect(result.valid).toBe(true);
      expect(result.value).toBe(5);
    });

    it('should parse string integers', () => {
      const result = validateIntegerParameter('25', 'page', {
        min: 1,
        max: 1000,
      });
      expect(result.valid).toBe(true);
      expect(result.value).toBe(25);
    });

    it('should apply default value when missing', () => {
      const result = validateIntegerParameter(undefined, 'limit', {
        min: 1,
        default: 10,
      });
      expect(result.valid).toBe(true);
      expect(result.value).toBe(10);
    });

    it('should reject values below minimum', () => {
      const result = validateIntegerParameter(0, 'page', { min: 1 });
      expect(result.valid).toBe(false);
    });

    it('should reject values above maximum', () => {
      const result = validateIntegerParameter(101, 'limit', {
        min: 1,
        max: 100,
      });
      expect(result.valid).toBe(false);
    });

    it('should reject NaN', () => {
      const result = validateIntegerParameter('abc', 'page');
      expect(result.valid).toBe(false);
    });
  });

  describe('Attack Prevention (Issue #409)', () => {
    it('should prevent DoS via extremely long barcode', () => {
      const attackBarcode = 'a'.repeat(10000);
      const result = validateBarcode(attackBarcode);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot exceed');
    });

    it('should prevent DoS via extremely long search query', () => {
      const attackQuery = 'a'.repeat(100000);
      const result = validateSearchQuery(attackQuery);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot exceed');
    });

    it('should prevent regex DoS via special characters', () => {
      // Even if a regex processes this, it should fail validation
      const attackString = 'a'.repeat(1000) + '(b|c)*d';
      const result = validateBarcode(attackString);

      // Either length check or character validation will catch it
      expect(result.valid).toBe(false);
    });

    it('should handle null/undefined gracefully', () => {
      const barcodeResult = validateBarcode(null);
      expect(barcodeResult.valid).toBe(false);

      const queryResult = validateSearchQuery(undefined);
      expect(queryResult.valid).toBe(false);
    });
  });

  describe('Validation Limits Constants', () => {
    it('should export correct limits', () => {
      expect(ValidationLimits.BARCODE_MAX).toBe(100);
      expect(ValidationLimits.QUERY_MAX).toBe(255);
      expect(ValidationLimits.QUERY_MIN).toBe(2);
    });
  });
});

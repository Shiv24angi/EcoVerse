/**
 * Input validation utilities for security and performance
 * Issue #409: Prevent unbounded query strings and barcode length attacks
 */

// Barcode format validation patterns
// Valid characters: digits, uppercase/lowercase letters, hyphens, plus, dot, space, slash, colon, percent
const BARCODE_PATTERN = /^[a-zA-Z0-9\-+.\s/:% ]*$/;
const MAX_BARCODE_LENGTH = 100;
const MAX_QUERY_LENGTH = 255;
const MIN_QUERY_LENGTH = 2;

/**
 * Validates a barcode input
 * - Maximum 100 characters (well above real barcode formats like EAN-13, UPC-A, QR)
 * - Only allows characters used in standard barcode formats
 *
 * Returns validation result with error message if invalid
 */
export function validateBarcode(barcode: unknown): {
  valid: boolean;
  error?: string;
  sanitized?: string;
} {
  // Type check
  if (typeof barcode !== 'string') {
    return {
      valid: false,
      error: 'Barcode must be a string',
    };
  }

  // Trim whitespace
  const sanitized = barcode.trim();

  // Empty check
  if (sanitized.length === 0) {
    return {
      valid: false,
      error: 'Barcode cannot be empty',
    };
  }

  // Length check
  if (sanitized.length > MAX_BARCODE_LENGTH) {
    return {
      valid: false,
      error: `Barcode cannot exceed ${MAX_BARCODE_LENGTH} characters (received ${sanitized.length})`,
    };
  }

  // Character set check
  if (!BARCODE_PATTERN.test(sanitized)) {
    return {
      valid: false,
      error: 'Barcode contains invalid characters. Use only letters, numbers, and -+./:% characters',
    };
  }

  return {
    valid: true,
    sanitized,
  };
}

/**
 * Validates a search query (product name, category, etc.)
 * - Minimum 2 characters
 * - Maximum 255 characters
 * - Prevents empty or excessively long queries
 */
export function validateSearchQuery(query: unknown): {
  valid: boolean;
  error?: string;
  sanitized?: string;
} {
  // Type check
  if (typeof query !== 'string') {
    return {
      valid: false,
      error: 'Search query must be a string',
    };
  }

  // Trim whitespace
  const sanitized = query.trim();

  // Length check - minimum
  if (sanitized.length < MIN_QUERY_LENGTH) {
    return {
      valid: false,
      error: `Search query must be at least ${MIN_QUERY_LENGTH} characters`,
    };
  }

  // Length check - maximum
  if (sanitized.length > MAX_QUERY_LENGTH) {
    return {
      valid: false,
      error: `Search query cannot exceed ${MAX_QUERY_LENGTH} characters (received ${sanitized.length})`,
    };
  }

  return {
    valid: true,
    sanitized,
  };
}

/**
 * Validates combined barcode format (must be 8-14 digits for standard formats)
 * Additional validation on top of basic barcode validation
 */
export function validateBarcodeFormat(barcode: string): {
  valid: boolean;
  error?: string;
} {
  // Must be 8-14 digit string for EAN/UPC formats
  // Allow other formats for QR codes, etc. (handled by regex)

  // If it's digits-only and outside 8-14 range, it's likely a malformed barcode
  if (/^\d+$/.test(barcode) && (barcode.length < 8 || barcode.length > 14)) {
    return {
      valid: false,
      error: 'Standard barcodes (EAN/UPC) must be 8-14 digits. Other formats supported with alphanumeric characters.',
    };
  }

  return {
    valid: true,
  };
}

/**
 * Validates integer-based parameters (page, limit, offset)
 * Prevents negative numbers and excessively large values
 */
export function validateIntegerParameter(
  value: unknown,
  paramName: string,
  options: {
    min?: number;
    max?: number;
    default?: number;
  } = {}
): {
  valid: boolean;
  value?: number;
  error?: string;
} {
  const { min = 0, max = 1000000, default: defaultValue } = options;

  // Parse value
  let parsed: number;
  if (typeof value === 'number') {
    parsed = value;
  } else if (typeof value === 'string') {
    parsed = parseInt(value, 10);
  } else if (value === null || value === undefined) {
    return defaultValue !== undefined
      ? { valid: true, value: defaultValue }
      : { valid: false, error: `${paramName} is required` };
  } else {
    return {
      valid: false,
      error: `${paramName} must be a number`,
    };
  }

  // NaN check
  if (isNaN(parsed)) {
    return {
      valid: false,
      error: `${paramName} must be a valid number`,
    };
  }

  // Range check
  if (parsed < min) {
    return {
      valid: false,
      error: `${paramName} must be at least ${min}`,
    };
  }

  if (parsed > max) {
    return {
      valid: false,
      error: `${paramName} must not exceed ${max}`,
    };
  }

  return {
    valid: true,
    value: parsed,
  };
}

export const ValidationLimits = {
  BARCODE_MAX: MAX_BARCODE_LENGTH,
  QUERY_MAX: MAX_QUERY_LENGTH,
  QUERY_MIN: MIN_QUERY_LENGTH,
};

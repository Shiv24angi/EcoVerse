/**
 * @jest-environment node
 */

import { generateRequestId, resolveRequestId } from '../request-id';

describe('request-id utilities (Issue #461)', () => {
  describe('generateRequestId', () => {
    it('should return a non-empty UUID', () => {
      const id = generateRequestId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('should return unique values on successive calls', () => {
      expect(generateRequestId()).not.toBe(generateRequestId());
    });

    it('should produce RFC 4122 UUID v4 format', () => {
      expect(generateRequestId()).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });
  });

  describe('resolveRequestId', () => {
    it('should adopt a well-formed inbound request ID', () => {
      const inbound = 'abc-123_456.789:ABCD';
      expect(resolveRequestId(inbound)).toBe(inbound);
    });

    it('should trim whitespace from an inbound request ID', () => {
      expect(resolveRequestId('  trace-id-42  ')).toBe('trace-id-42');
    });

    it('should generate a new ID when no inbound ID is present', () => {
      const id = resolveRequestId(null);
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should generate a new ID for an empty string', () => {
      expect(resolveRequestId('')).toMatch(/^[0-9a-f-]{36}$/i);
    });

    it('should reject unsafe values containing header-breaking characters', () => {
      const id = resolveRequestId('abc\r\nX-Evil: 1');
      expect(id).not.toContain('\r');
      expect(id).not.toContain('\n');
      expect(id).not.toBe('abc\r\nX-Evil: 1');
    });

    it('should reject overly long inbound IDs to bound header size', () => {
      const id = resolveRequestId('a'.repeat(200));
      expect(id.length).toBeLessThanOrEqual(64);
      expect(id).not.toBe('a'.repeat(200));
    });
  });
});

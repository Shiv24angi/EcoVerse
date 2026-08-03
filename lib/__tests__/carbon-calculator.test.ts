import {
  calculateCarbonFootprint,
  getCategoryColor,
} from '../carbon-calculator';

describe('calculateCarbonFootprint', () => {
  // ── Exact database match ───────────────────────────────────────────────────
  describe('exact match against the carbon database', () => {
    it('should return the database value with high confidence', () => {
      const result = calculateCarbonFootprint('beef');
      expect(result.carbonFootprint).toBe(13.5); // 27.0 kgCO2/kg * 0.5 kg
      expect(result.category).toBe('Meat & Fish');
      expect(result.confidence).toBe('high');
    });

    it('should match case-insensitively', () => {
      const result = calculateCarbonFootprint('Organic BEEF Steak');
      expect(result.confidence).toBe('high');
      expect(result.category).toBe('Meat & Fish');
    });

    it('should round the footprint to 2 decimal places', () => {
      const result = calculateCarbonFootprint('water');
      expect(result.carbonFootprint).toBe(0); // 0.0001 * 1.0 rounds to 0.00
    });
  });

  // ── Keyword fallback ────────────────────────────────────────────────────────
  describe('keyword matching when no exact database key is present', () => {
    it('should match through a keyword alias with medium confidence', () => {
      const result = calculateCarbonFootprint('grilled poultry breast');
      expect(result.confidence).toBe('medium');
      expect(result.category).toBe('Meat & Fish'); // resolved via "chicken" entry
      expect(result.carbonFootprint).toBe(3.45); // 6.9 * 0.5
    });
  });

  // ── Category-based fallback ─────────────────────────────────────────────────
  describe('category estimate when no exact or keyword match is found', () => {
    it('should fall back to a category estimate with low confidence', () => {
      const result = calculateCarbonFootprint('mystery meat product');
      expect(result.confidence).toBe('low');
      expect(result.category).toBe('Unknown');
      expect(result.carbonFootprint).toBe(15.0);
    });

    it('should use the first matching category when a name contains several', () => {
      // "meat" is checked before "vegetable" in CATEGORY_ESTIMATES
      const result = calculateCarbonFootprint('meat and vegetable stew');
      expect(result.carbonFootprint).toBe(15.0);
    });
  });

  // ── Ultimate fallback ────────────────────────────────────────────────────────
  describe('ultimate fallback for completely unrecognized products', () => {
    it('should return the default processed-food estimate', () => {
      const result = calculateCarbonFootprint('xyzzy widget 123');
      expect(result.carbonFootprint).toBe(2.5);
      expect(result.category).toBe('Unknown');
      expect(result.confidence).toBe('low');
    });

    it('should not throw on an empty product name', () => {
      const result = calculateCarbonFootprint('');
      expect(result.carbonFootprint).toBe(2.5);
      expect(result.confidence).toBe('low');
    });
  });

  // ── Brand parameter ──────────────────────────────────────────────────────────
  describe('optional brand parameter', () => {
    it('should not change the result whether or not a brand is passed', () => {
      const withoutBrand = calculateCarbonFootprint('apple');
      const withBrand = calculateCarbonFootprint('apple', 'Some Brand');
      expect(withBrand).toEqual(withoutBrand);
    });
  });
});

describe('getCategoryColor', () => {
  it('should return the color for a known category', () => {
    expect(getCategoryColor('Meat & Fish')).toBe('bg-red-500');
    expect(getCategoryColor('Beverages')).toBe('bg-blue-500');
  });

  it('should fall back to the Unknown color for an unrecognized category', () => {
    expect(getCategoryColor('Not A Real Category')).toBe('bg-gray-400');
  });
});

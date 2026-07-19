import {
  CARBON_DATABASE,
  KEYWORD_MATCHES,
  CATEGORY_ESTIMATES,
  CATEGORY_COLORS,
} from './env-constants';

export function calculateCarbonFootprint(
  productName: string,
  brand?: string
): {
  carbonFootprint: number;
  category: string;
  confidence: 'high' | 'medium' | 'low';
  calculation: string;
} {
  const normalizedName = productName.toLowerCase();

  // Try exact match first
  for (const [key, data] of Object.entries(CARBON_DATABASE)) {
    if (normalizedName.includes(key)) {
      const carbonFootprint = parseFloat(
        (data.kgCO2PerKg * data.defaultWeight).toFixed(2)
      );
      return {
        carbonFootprint,
        category: data.category,
        confidence: 'high',
        calculation: `${data.kgCO2PerKg} kg CO₂/kg × ${data.defaultWeight} kg = ${carbonFootprint} kg CO₂`,
      };
    }
  }

  // Keyword matching for partial matches
  for (const [product, keywords] of Object.entries(KEYWORD_MATCHES)) {
    if (keywords.some((keyword) => normalizedName.includes(keyword))) {
      const data = CARBON_DATABASE[product];
      if (data) {
        const carbonFootprint = parseFloat(
          (data.kgCO2PerKg * data.defaultWeight).toFixed(2)
        );
        return {
          carbonFootprint,
          category: data.category,
          confidence: 'medium',
          calculation: `${data.kgCO2PerKg} kg CO₂/kg × ${data.defaultWeight} kg = ${carbonFootprint} kg CO₂ (estimated)`,
        };
      }
    }
  }

  // Category-based estimation as fallback
  for (const [category, estimate] of Object.entries(CATEGORY_ESTIMATES)) {
    if (normalizedName.includes(category)) {
      return {
        carbonFootprint: estimate,
        category: 'Unknown',
        confidence: 'low',
        calculation: `Category-based estimate: ${estimate} kg CO₂`,
      };
    }
  }

  // Ultimate fallback - average processed food
  return {
    carbonFootprint: 2.5,
    category: 'Unknown',
    confidence: 'low',
    calculation: 'Default estimate for processed food: 2.5 kg CO₂',
  };
}

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS['Unknown'];
}

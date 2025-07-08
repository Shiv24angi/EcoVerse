interface CarbonData {
  [key: string]: {
    kgCO2PerKg: number;
    defaultWeight: number; // in kg
    category: string;
  }
}

// Real carbon footprint data based on scientific studies
const carbonDatabase: CarbonData = {
  // Meat & Fish
  beef: { kgCO2PerKg: 27.0, defaultWeight: 0.5, category: "Meat & Fish" },
  lamb: { kgCO2PerKg: 24.5, defaultWeight: 0.5, category: "Meat & Fish" },
  cheese: { kgCO2PerKg: 13.5, defaultWeight: 0.2, category: "Dairy" },
  pork: { kgCO2PerKg: 12.1, defaultWeight: 0.5, category: "Meat & Fish" },
  chicken: { kgCO2PerKg: 6.9, defaultWeight: 0.5, category: "Meat & Fish" },
  fish: { kgCO2PerKg: 6.1, defaultWeight: 0.3, category: "Meat & Fish" },
  
  // Dairy
  milk: { kgCO2PerKg: 3.2, defaultWeight: 1.0, category: "Dairy" },
  yogurt: { kgCO2PerKg: 2.2, defaultWeight: 0.5, category: "Dairy" },
  butter: { kgCO2PerKg: 23.8, defaultWeight: 0.25, category: "Dairy" },
  
  // Beverages
  coffee: { kgCO2PerKg: 16.9, defaultWeight: 0.25, category: "Beverages" },
  tea: { kgCO2PerKg: 6.8, defaultWeight: 0.1, category: "Beverages" },
  beer: { kgCO2PerKg: 0.89, defaultWeight: 0.5, category: "Beverages" },
  wine: { kgCO2PerKg: 1.79, defaultWeight: 0.75, category: "Beverages" },
  "soft drink": { kgCO2PerKg: 0.39, defaultWeight: 0.5, category: "Beverages" },
  water: { kgCO2PerKg: 0.0001, defaultWeight: 1.0, category: "Beverages" },
  
  // Grains & Cereals
  rice: { kgCO2PerKg: 2.7, defaultWeight: 1.0, category: "Grains & Cereals" },
  wheat: { kgCO2PerKg: 1.4, defaultWeight: 1.0, category: "Grains & Cereals" },
  oats: { kgCO2PerKg: 2.5, defaultWeight: 0.5, category: "Grains & Cereals" },
  bread: { kgCO2PerKg: 0.98, defaultWeight: 0.5, category: "Grains & Cereals" },
  pasta: { kgCO2PerKg: 1.4, defaultWeight: 0.5, category: "Grains & Cereals" },
  
  // Fruits & Vegetables
  apple: { kgCO2PerKg: 0.42, defaultWeight: 1.0, category: "Fruits & Vegetables" },
  banana: { kgCO2PerKg: 0.86, defaultWeight: 1.0, category: "Fruits & Vegetables" },
  orange: { kgCO2PerKg: 0.31, defaultWeight: 1.0, category: "Fruits & Vegetables" },
  tomato: { kgCO2PerKg: 2.1, defaultWeight: 1.0, category: "Fruits & Vegetables" },
  potato: { kgCO2PerKg: 0.46, defaultWeight: 1.0, category: "Fruits & Vegetables" },
  carrot: { kgCO2PerKg: 0.35, defaultWeight: 1.0, category: "Fruits & Vegetables" },
  lettuce: { kgCO2PerKg: 0.73, defaultWeight: 0.5, category: "Fruits & Vegetables" },
  
  // Nuts & Legumes
  almonds: { kgCO2PerKg: 14.3, defaultWeight: 0.2, category: "Nuts & Legumes" },
  peanuts: { kgCO2PerKg: 3.2, defaultWeight: 0.2, category: "Nuts & Legumes" },
  beans: { kgCO2PerKg: 2.0, defaultWeight: 0.5, category: "Nuts & Legumes" },
  lentils: { kgCO2PerKg: 0.9, defaultWeight: 0.5, category: "Nuts & Legumes" },
  
  // Snacks & Sweets
  chocolate: { kgCO2PerKg: 18.7, defaultWeight: 0.1, category: "Snacks & Sweets" },
  cookies: { kgCO2PerKg: 3.2, defaultWeight: 0.3, category: "Snacks & Sweets" },
  chips: { kgCO2PerKg: 4.6, defaultWeight: 0.15, category: "Snacks & Sweets" },
  
  // Oils & Condiments
  "olive oil": { kgCO2PerKg: 5.4, defaultWeight: 0.5, category: "Oils & Condiments" },
  "vegetable oil": { kgCO2PerKg: 3.3, defaultWeight: 0.5, category: "Oils & Condiments" },
  sugar: { kgCO2PerKg: 3.2, defaultWeight: 1.0, category: "Oils & Condiments" },
}

export function calculateCarbonFootprint(productName: string, brand?: string): {
  carbonFootprint: number;
  category: string;
  confidence: 'high' | 'medium' | 'low';
  calculation: string;
} {
  const normalizedName = productName.toLowerCase()
  
  // Try exact match first
  for (const [key, data] of Object.entries(carbonDatabase)) {
    if (normalizedName.includes(key)) {
      const carbonFootprint = parseFloat((data.kgCO2PerKg * data.defaultWeight).toFixed(2))
      return {
        carbonFootprint,
        category: data.category,
        confidence: 'high',
        calculation: `${data.kgCO2PerKg} kg CO₂/kg × ${data.defaultWeight} kg = ${carbonFootprint} kg CO₂`
      }
    }
  }
  
  // Keyword matching for partial matches
  const keywordMatches: { [key: string]: string[] } = {
    beef: ['beef', 'steak', 'burger', 'ground beef'],
    chicken: ['chicken', 'poultry', 'wing', 'breast'],
    milk: ['milk', 'dairy milk'],
    bread: ['bread', 'loaf', 'baguette'],
    cheese: ['cheese', 'cheddar', 'mozzarella', 'swiss'],
    chocolate: ['chocolate', 'cocoa', 'candy bar'],
    coffee: ['coffee', 'espresso', 'cappuccino'],
    apple: ['apple', 'red apple', 'green apple'],
    banana: ['banana', 'plantain'],
    rice: ['rice', 'basmati', 'jasmine rice'],
    pasta: ['pasta', 'spaghetti', 'macaroni', 'noodles'],
    potato: ['potato', 'spud', 'russet'],
    tomato: ['tomato', 'cherry tomato'],
  }
  
  for (const [product, keywords] of Object.entries(keywordMatches)) {
    if (keywords.some(keyword => normalizedName.includes(keyword))) {
      const data = carbonDatabase[product]
      if (data) {
        const carbonFootprint = parseFloat((data.kgCO2PerKg * data.defaultWeight).toFixed(2))
        return {
          carbonFootprint,
          category: data.category,
          confidence: 'medium',
          calculation: `${data.kgCO2PerKg} kg CO₂/kg × ${data.defaultWeight} kg = ${carbonFootprint} kg CO₂ (estimated)`
        }
      }
    }
  }
  
  // Category-based estimation as fallback
  const categoryEstimates = {
    meat: 15.0,
    dairy: 5.0,
    beverage: 1.0,
    snack: 3.0,
    grain: 1.5,
    fruit: 0.5,
    vegetable: 0.8,
    processed: 4.0,
  }
  
  for (const [category, estimate] of Object.entries(categoryEstimates)) {
    if (normalizedName.includes(category)) {
      return {
        carbonFootprint: estimate,
        category: 'Unknown',
        confidence: 'low',
        calculation: `Category-based estimate: ${estimate} kg CO₂`
      }
    }
  }
  
  // Ultimate fallback - average processed food
  return {
    carbonFootprint: 2.5,
    category: 'Unknown',
    confidence: 'low',
    calculation: 'Default estimate for processed food: 2.5 kg CO₂'
  }
}

export function getCategoryColor(category: string): string {
  const colors: { [key: string]: string } = {
    "Meat & Fish": "bg-red-500",
    "Dairy": "bg-orange-500",
    "Fruits & Vegetables": "bg-green-500",
    "Grains & Cereals": "bg-yellow-500",
    "Beverages": "bg-blue-500",
    "Snacks & Sweets": "bg-purple-500",
    "Nuts & Legumes": "bg-amber-500",
    "Oils & Condiments": "bg-gray-500",
    "Unknown": "bg-gray-400"
  }
  
  return colors[category] || colors["Unknown"]
}

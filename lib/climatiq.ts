import axios from 'axios';
import dbConnect from '@/lib/mongodb';
import CarbonCache from '@/models/CarbonCache';
import { calculateCarbonFootprint } from '@/lib/carbon-calculator';
import { CARBON_DATABASE } from '@/lib/env-constants';

export interface CarbonFootprintResult {
  carbonFootprint: number;
  category: string;
  confidence: 'high' | 'medium' | 'low';
  calculation: string;
  source: string;
}

/**
 * Resolves the carbon footprint of a product, querying Climatiq API first if available,
 * using cached values if possible, and falling back to the local calculator.
 */
export async function getCarbonFootprint(
  productName: string,
  brand?: string
): Promise<CarbonFootprintResult> {
  const normalizedName = productName.trim().toLowerCase();
  const normalizedBrand = brand?.trim().toLowerCase() || '';
  const queryKey = `${normalizedName}|${normalizedBrand}`;

  try {
    await dbConnect();

    // 1. Check cache first
    const cached = await CarbonCache.findOne({ queryKey }).lean();
    if (cached) {
      return {
        carbonFootprint: cached.carbonEstimate,
        category: cached.category,
        confidence: cached.confidence as 'high' | 'medium' | 'low',
        calculation: cached.calculation,
        source: cached.source,
      };
    }
  } catch (dbError) {
    console.warn('[CarbonCache] Database error check:', dbError);
  }

  const apiKey = process.env.CLIMATIQ_API_KEY;

  // 2. Query Climatiq if API key is configured
  if (apiKey && apiKey !== 'your_climatiq_api_key_here') {
    // Validate external API URLs before making requests
    const climatiqUrl = 'https://api.climatiq.io/data/v1/search';
    try {
      const parsedUrl = new URL(climatiqUrl);
      if (!parsedUrl.hostname.endsWith('climatiq.io')) {
        throw new Error('Invalid Climatiq hostname');
      }
    } catch {
      console.warn('[Climatiq API] Invalid URL configuration');
      return fallback();
    }

    try {
      // Search for the emission factor
      const searchResponse = await axios.get(climatiqUrl, {
        headers: { Authorization: `Bearer ${apiKey}` },
        params: {
          query: productName,
          data_version: '^3',
        },
        timeout: 3000, // 3-second limit to keep scanner fast
      });

      const results = searchResponse.data?.results;
      if (results && results.length > 0) {
        const factorResult = results[0];

        // Find matching default weight and category from local DB mapping
        let defaultWeight = 0.5;
        let matchedCategory = 'Unknown';
        for (const [key, data] of Object.entries(CARBON_DATABASE)) {
          if (normalizedName.includes(key)) {
            defaultWeight = data.defaultWeight;
            matchedCategory = data.category;
            break;
          }
        }

        // Post estimate request to Climatiq
        const estimateResponse = await axios.post(
          'https://api.climatiq.io/data/v1/estimate',
          {
            emission_factor: {
              id: factorResult.id,
            },
            parameters: {
              weight: defaultWeight,
              weight_unit: 'kg',
            },
          },
          {
            headers: { Authorization: `Bearer ${apiKey}` },
            timeout: 3000,
          }
        );

        const co2e = estimateResponse.data?.co2e;

        // Validate CO2e value: reject negative or unreasonably high values
        if (typeof co2e === 'number') {
          if (co2e < 0 || co2e > 10000) {
            console.warn(
              `[Climatiq API] Invalid CO2e value (${co2e}), using fallback`
            );
            return fallback();
          }
          const result: CarbonFootprintResult = {
            carbonFootprint: parseFloat(co2e.toFixed(2)),
            category:
              matchedCategory !== 'Unknown'
                ? matchedCategory
                : factorResult.category || 'Unknown',
            confidence: 'high',
            calculation: `${co2e.toFixed(2)} kg CO₂e based on Climatiq (${factorResult.name})`,
            source: 'Climatiq API',
          };

          // Cache the result
          try {
            await CarbonCache.create({
              queryKey,
              carbonEstimate: result.carbonFootprint,
              category: result.category,
              confidence: result.confidence,
              calculation: result.calculation,
              source: result.source,
            });
          } catch (cacheWriteError) {
            console.warn(
              '[CarbonCache] Failed to save cache record:',
              cacheWriteError
            );
          }

          return result;
        }
      }
    } catch (apiError) {
      console.warn(`[Climatiq API] Request failed or timed out:`, apiError);
    }
  }

  return fallback();

  async function fallback() {
    const localData = calculateCarbonFootprint(productName, brand);
    const result: CarbonFootprintResult = {
      carbonFootprint: localData.carbonFootprint,
      category: localData.category,
      confidence: localData.confidence,
      calculation: localData.calculation,
      source: 'Local Calculator (Fallback)',
    };

    // Cache fallback results to avoid checking Climatiq repeatedly
    try {
      await CarbonCache.create({
        queryKey,
        carbonEstimate: result.carbonFootprint,
        category: result.category,
        confidence: result.confidence,
        calculation: result.calculation,
        source: result.source,
      });
    } catch (cacheWriteError) {
      console.warn(
        '[CarbonCache] Failed to save fallback cache record:',
        cacheWriteError
      );
    }

    return result;
  }
}

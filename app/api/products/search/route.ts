export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const MIN_PAGE_SIZE = 1;

interface OpenFoodFactsProduct {
  code: string;
  product_name?: string;
  brands?: string;
  categories?: string;
  image_front_url?: string;
  image_url?: string;
  generic_name?: string;
  quantity?: string;
  packaging?: string;
}

interface SearchResult {
  id: string;
  name: string;
  brand: string;
  categories: string;
  image: string | null;
  quantity: string;
  packaging: string;
}

/**
 * GET /api/products/search
 *
 * Search for products with pagination support.
 *
 * Query parameters:
 * - q: Search query (product name, barcode prefix, or category)
 * - page: Page number (1-based, default: 1)
 * - limit: Results per page (1-50, default: 10)
 *
 * Response headers:
 * - X-Total-Count: Total number of results available
 * - X-Page: Current page number
 * - X-Limit: Results per page
 * - X-Total-Pages: Total number of pages
 *
 * Issues fixed:
 * #411: Product lookup endpoint had no pagination or result-set size limit
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();
    const pageParam = parseInt(searchParams.get('page') || '1', 10);
    const limitParam = parseInt(
      searchParams.get('limit') || String(DEFAULT_PAGE_SIZE),
      10
    );

    // Validate query parameter
    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Validate and clamp pagination parameters
    const limit = Math.min(
      Math.max(limitParam || DEFAULT_PAGE_SIZE, MIN_PAGE_SIZE),
      MAX_PAGE_SIZE
    );
    const page = Math.max(pageParam || 1, 1);
    const offset = (page - 1) * limit;

    // Search OpenFoodFacts API with pagination support
    // API endpoint: https://world.openfoodfacts.org/cgi/search.pl
    // Returns paginated results with total count
    const response = await axios.get<{
      products: OpenFoodFactsProduct[];
      count: number;
      page: number;
      page_size: number;
    }>('https://world.openfoodfacts.org/cgi/search.pl', {
      params: {
        search_terms: query,
        page: page,
        page_size: limit,
        action: 'process',
        json: 1,
      },
      timeout: 10000, // 10 second timeout to prevent hanging requests
    });

    const { products = [], count = 0 } = response.data;

    // Map results to standardized format
    const results: SearchResult[] = (products || []).map((product) => ({
      id: product.code || '',
      name: product.product_name || 'Unknown Product',
      brand: product.brands || 'Unknown Brand',
      categories: product.categories || 'Uncategorized',
      image: product.image_front_url || product.image_url || null,
      quantity: product.quantity || '',
      packaging: product.packaging || '',
    }));

    const totalPages = Math.ceil(count / limit);
    const hasMore = page < totalPages;

    // Build response with pagination headers
    const response_obj = NextResponse.json(
      {
        results,
        pagination: {
          page,
          limit,
          total: count,
          totalPages,
          hasMore,
        },
      },
      { status: 200 }
    );

    // Add pagination headers
    response_obj.headers.set('X-Total-Count', String(count));
    response_obj.headers.set('X-Page', String(page));
    response_obj.headers.set('X-Limit', String(limit));
    response_obj.headers.set('X-Total-Pages', String(totalPages));

    return response_obj;
  } catch (error) {
    // Handle specific error types
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        return NextResponse.json(
          { error: 'Search request timed out. Please try again.' },
          { status: 504 }
        );
      }
      if (error.response?.status === 429) {
        return NextResponse.json(
          { error: 'Rate limited. Please wait before searching again.' },
          { status: 429 }
        );
      }
    }

    console.error('Product search error:', error);
    return NextResponse.json(
      { error: 'Failed to search products' },
      { status: 500 }
    );
  }
}

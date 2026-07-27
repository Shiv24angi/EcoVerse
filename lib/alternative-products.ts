import User from '@/models/User';

export interface AlternativeProduct {
  productName: string;
  avgCarbonEstimate: number;
  sampleCount: number;
  percentLower: number;
}

const MIN_SAMPLE_COUNT = 2;

const CARBON_IMPROVEMENT_THRESHOLD = 0.8;


export async function findLowerCarbonAlternatives(
  category: string,
  currentCarbon: number,
  excludeProductName: string,
  limit = 3
): Promise<AlternativeProduct[]> {
  if (!category || !Number.isFinite(currentCarbon) || currentCarbon <= 0) {
    return [];
  }

  const maxAllowedCarbon = currentCarbon * CARBON_IMPROVEMENT_THRESHOLD;

  const results = await User.aggregate([
    { $unwind: '$scans' },
    {
      $match: {
        'scans.category': category,
        'scans.productName': { $ne: excludeProductName },
        'scans.carbonEstimate': { $lt: maxAllowedCarbon },
      },
    },
    {
      $group: {
        _id: '$scans.productName',
        avgCarbonEstimate: { $avg: '$scans.carbonEstimate' },
        sampleCount: { $sum: 1 },
      },
    },
    { $match: { sampleCount: { $gte: MIN_SAMPLE_COUNT } } },
    { $sort: { avgCarbonEstimate: 1 } },
    { $limit: limit },
  ]);

  return results.map((r) => ({
    productName: r._id,
    avgCarbonEstimate: r.avgCarbonEstimate,
    sampleCount: r.sampleCount,
    percentLower: Math.round(
      ((currentCarbon - r.avgCarbonEstimate) / currentCarbon) * 100
    ),
  }));
}
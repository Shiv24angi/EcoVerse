import { findLowerCarbonAlternatives } from '../alternative-products';
import User from '@/models/User';

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    aggregate: jest.fn(),
  },
}));

type SyntheticScan = {
  productName: string;
  category: string;
  carbonEstimate: number;
};
type SyntheticUser = { scans: SyntheticScan[] };
type PipelineStage = Record<string, unknown>;
type PipelineDoc = Record<string, unknown>;

function runPipeline(users: SyntheticUser[], pipeline: PipelineStage[]) {
  let docs: PipelineDoc[] = users.flatMap((u) =>
    u.scans.map((s) => ({ scans: s }))
  );

  for (const stage of pipeline) {
    if (stage.$unwind) {
      continue;
    }
    if (stage.$match) {
      docs = docs.filter((doc) =>
        matchesFilter(stage.$match as Record<string, unknown>, doc)
      );
    }
    if (stage.$group) {
      const groupSpec = stage.$group as Record<string, unknown>;
      const groups = new Map<string, PipelineDoc[]>();
      for (const doc of docs) {
        const key = resolvePath(
          doc,
          (groupSpec._id as string).replace('$', '')
        ) as string;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(doc);
      }
      docs = Array.from(groups.entries()).map(([key, groupDocs]) => {
        const result: PipelineDoc = { _id: key };
        for (const [field, expr] of Object.entries(groupSpec)) {
          if (field === '_id') continue;
          const e = expr as Record<string, string | number>;
          if (e.$avg) {
            const path = (e.$avg as string).replace('$', '');
            const vals = groupDocs.map(
              (d) => resolvePath(d, path) as number
            );
            result[field] = vals.reduce((a, b) => a + b, 0) / vals.length;
          }
          if (e.$sum === 1) {
            result[field] = groupDocs.length;
          }
        }
        return result;
      });
    }
    if (stage.$sort) {
      const [field, dir] = Object.entries(
        stage.$sort as Record<string, number>
      )[0];
      docs = [...docs].sort(
        (a, b) => ((a[field] as number) - (b[field] as number)) * dir
      );
    }
    if (stage.$limit) {
      docs = docs.slice(0, stage.$limit as number);
    }
  }

  return docs;
}

function resolvePath(doc: PipelineDoc, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (acc, key) => (acc as Record<string, unknown> | undefined)?.[key],
      doc
    );
}

function matchesFilter(
  filter: Record<string, unknown>,
  doc: PipelineDoc
): boolean {
  return Object.entries(filter).every(([key, condition]) => {
    const docVal = resolvePath(doc, key);
    if (condition && typeof condition === 'object') {
      return Object.entries(condition as Record<string, unknown>).every(
        ([op, val]) => {
          switch (op) {
            case '$ne':
              return docVal !== val;
            case '$lt':
              return (docVal as number) < (val as number);
            case '$gte':
              return (docVal as number) >= (val as number);
            default:
              throw new Error(`Unsupported operator ${op}`);
          }
        }
      );
    }
    return docVal === condition;
  });
}

describe('findLowerCarbonAlternatives', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const syntheticUsers = [
    {
      scans: [
        { productName: 'Oat Milk A', category: 'dairy-alternatives', carbonEstimate: 0.5 },
        { productName: 'Oat Milk A', category: 'dairy-alternatives', carbonEstimate: 0.6 },
       
        { productName: 'Almond Milk B', category: 'dairy-alternatives', carbonEstimate: 0.7 },
        { productName: 'Almond Milk B', category: 'dairy-alternatives', carbonEstimate: 0.75 },
        
        { productName: 'Rare Milk C', category: 'dairy-alternatives', carbonEstimate: 0.1 },
        
        { productName: 'Regular Milk D', category: 'dairy-alternatives', carbonEstimate: 0.95 },
        { productName: 'Regular Milk D', category: 'dairy-alternatives', carbonEstimate: 0.9 },
       
        { productName: 'Snack E', category: 'snacks', carbonEstimate: 0.2 },
        { productName: 'Snack E', category: 'snacks', carbonEstimate: 0.2 },
      ],
    },
  ];

  function mockAggregateAgainstSyntheticData() {
    (User.aggregate as jest.Mock).mockImplementation((pipeline: any[]) =>
      Promise.resolve(runPipeline(syntheticUsers, pipeline))
    );
  }

  it('returns lower-carbon alternatives sorted by carbon ascending', async () => {
    mockAggregateAgainstSyntheticData();

    const result = await findLowerCarbonAlternatives(
      'dairy-alternatives',
      1.0,
      'Dairy Milk Original'
    );

    expect(result.map((r) => r.productName)).toEqual([
      'Oat Milk A',
      'Almond Milk B',
    ]);
    expect(result[0].avgCarbonEstimate).toBeCloseTo(0.55);
    expect(result[0].sampleCount).toBe(2);
    expect(result[0].percentLower).toBe(45); // (1.0 - 0.55) / 1.0 = 45%
    expect(result[1].avgCarbonEstimate).toBeCloseTo(0.725);
  });

  it('excludes products with fewer than the minimum sample count', async () => {
    mockAggregateAgainstSyntheticData();

    const result = await findLowerCarbonAlternatives(
      'dairy-alternatives',
      1.0,
      'Dairy Milk Original'
    );

    expect(result.find((r) => r.productName === 'Rare Milk C')).toBeUndefined();
  });

  it('excludes products that are not meaningfully lower carbon (threshold filtering)', async () => {
    mockAggregateAgainstSyntheticData();

    const result = await findLowerCarbonAlternatives(
      'dairy-alternatives',
      1.0,
      'Dairy Milk Original'
    );

    // Regular Milk D averages 0.925, which is not below 1.0 * 0.8 = 0.8.
    expect(
      result.find((r) => r.productName === 'Regular Milk D')
    ).toBeUndefined();
  });

  it('returns an empty array when no products exist in the given category', async () => {
    mockAggregateAgainstSyntheticData();

    const result = await findLowerCarbonAlternatives(
      'nonexistent-category',
      1.0,
      'Dairy Milk Original'
    );

    expect(result).toEqual([]);
  });

  it('does not include the currently scanned product itself', async () => {
    (User.aggregate as jest.Mock).mockImplementation((pipeline: any[]) =>
      Promise.resolve(
        runPipeline(
          [
            {
              scans: [
                { productName: 'Oat Milk A', category: 'dairy-alternatives', carbonEstimate: 0.3 },
                { productName: 'Oat Milk A', category: 'dairy-alternatives', carbonEstimate: 0.3 },
              ],
            },
          ],
          pipeline
        )
      )
    );

    const result = await findLowerCarbonAlternatives(
      'dairy-alternatives',
      1.0,
      'Oat Milk A'
    );

    expect(result).toEqual([]);
  });

  it('respects the limit parameter', async () => {
    mockAggregateAgainstSyntheticData();

    const result = await findLowerCarbonAlternatives(
      'dairy-alternatives',
      1.0,
      'Dairy Milk Original',
      1
    );

    expect(result).toHaveLength(1);
    expect(result[0].productName).toBe('Oat Milk A');
  });

  it('returns an empty array without querying the database for invalid inputs', async () => {
    (User.aggregate as jest.Mock).mockResolvedValue([]);

    expect(await findLowerCarbonAlternatives('', 1.0, 'X')).toEqual([]);
    expect(await findLowerCarbonAlternatives('dairy', 0, 'X')).toEqual([]);
    expect(await findLowerCarbonAlternatives('dairy', -5, 'X')).toEqual([]);
    expect(await findLowerCarbonAlternatives('dairy', NaN, 'X')).toEqual([]);

    expect(User.aggregate).not.toHaveBeenCalled();
  });
});
type AlternativeProduct = {
  productName: string;
  avgCarbonEstimate: number;
  sampleCount: number;
  percentLower: number;
};

type AlternativeProductsProps = {
  alternatives: AlternativeProduct[] | null;
};

export default function AlternativeProductsCard({
  alternatives,
}: AlternativeProductsProps) {
  if (!alternatives || alternatives.length === 0) {
    return null;
  }

  return (
    <div className="bg-green-50 p-4 rounded-xl shadow-md mt-4">
      <h3 className="text-lg font-semibold text-green-800">
        🌱 Consider these lower-carbon alternatives
      </h3>
      <ul className="mt-2 space-y-2 text-green-700">
        {alternatives.map((alt) => (
          <li
            key={alt.productName}
            className="flex items-center justify-between"
          >
            <span>{alt.productName}</span>
            <span className="text-sm font-medium">
              {alt.avgCarbonEstimate.toFixed(2)} kg CO₂ · {alt.percentLower}%
              lower
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-green-600">
        Based on other EcoVerse users&apos; scans of similar products.
      </p>
    </div>
  );
}
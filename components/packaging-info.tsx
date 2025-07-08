type PackagingProps = {
  material: string;
  recyclable: boolean;
  biodegradable: boolean;
  inferred?: boolean;
};

export default function PackagingInfoCard({ material, recyclable, biodegradable, inferred }: PackagingProps) {
  return (
    <div className="bg-green-50 p-4 rounded-xl shadow-md mt-4">
      <h3 className="text-lg font-semibold text-green-800">♻️ Packaging Info</h3>
      <ul className="mt-2 space-y-1 text-green-700">
        <li><strong>Material:</strong> {material}</li>
        <li><strong>Recyclable:</strong> {recyclable ? "Yes ✅" : "No ❌"}</li>
        <li><strong>Biodegradable:</strong> {biodegradable ? "Yes ✅" : "No ❌"}</li>
        {inferred && (
          <li className="text-sm text-yellow-800">⚠️ Estimated based on product category</li>
        )}
      </ul>
    </div>
  );
}

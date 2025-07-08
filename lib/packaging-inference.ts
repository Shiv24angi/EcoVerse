type PackagingInfo = {
  material: string;
  recyclable: boolean;
  biodegradable: boolean;
  inferred: boolean;
};

const categoryPackagingMap: Record<string, PackagingInfo> = {
  sodas: {
    material: "PET/Aluminum",
    recyclable: true,
    biodegradable: false,
    inferred: true,
  },
  chips: {
    material: "Multi-layer plastic",
    recyclable: false,
    biodegradable: false,
    inferred: true,
  },
  yogurts: {
    material: "Plastic (PP)",
    recyclable: true,
    biodegradable: false,
    inferred: true,
  },
  fruit: {
    material: "Organic or Paper",
    recyclable: true,
    biodegradable: true,
    inferred: true,
  },
  milk: {
    material: "Tetra Pak",
    recyclable: true,
    biodegradable: false,
    inferred: true,
  },
  vegetables: {
    material: "Loose/Compostable Bag",
    recyclable: true,
    biodegradable: true,
    inferred: true,
  },
};

export function inferPackaging(categories: string[] = []): PackagingInfo {
  for (const cat of categories) {
    const lowerCat = cat.toLowerCase();
    const match = Object.keys(categoryPackagingMap).find(key =>
      lowerCat.includes(key)
    );
    if (match) return categoryPackagingMap[match];
  }

  return {
    material: "Unknown",
    recyclable: false,
    biodegradable: false,
    inferred: false,
  };
}

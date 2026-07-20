import { CATEGORY_PACKAGING_MAP, PackagingInfo } from './env-constants';

export function inferPackaging(categories: string[] = []): PackagingInfo {
  for (const cat of categories) {
    const lowerCat = cat.toLowerCase();
    const match = Object.keys(CATEGORY_PACKAGING_MAP).find((key) =>
      lowerCat.includes(key)
    );
    if (match) return CATEGORY_PACKAGING_MAP[match];
  }

  return {
    material: 'Unknown',
    recyclable: false,
    biodegradable: false,
    inferred: false,
  };
}

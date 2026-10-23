export interface Tier {
  name: 'mobile' | 'tablet' | 'desktop';
  count: number;
  nodeCount: number;
  maxDpr: number;
  frameMs: number;
}

const TIERS: Record<Tier['name'], Tier> = {
  mobile: { name: 'mobile', count: 6000, nodeCount: 650, maxDpr: 1.5, frameMs: 16 },
  tablet: { name: 'tablet', count: 11000, nodeCount: 1100, maxDpr: 1.75, frameMs: 16 },
  desktop: { name: 'desktop', count: 18000, nodeCount: 1600, maxDpr: 2, frameMs: 0 },
};

const LOW_CORE_COUNT = 4;

/** Sceglie il livello di dettaglio dal viewport e dal numero di core: meno particelle sui dispositivi deboli. */
export function pickTier(viewportWidth: number, hardwareConcurrency = 8): Tier {
  const weak = hardwareConcurrency <= LOW_CORE_COUNT;
  if (viewportWidth < 700) return TIERS.mobile;
  if (viewportWidth < 1100 || weak) return TIERS.tablet;
  return TIERS.desktop;
}

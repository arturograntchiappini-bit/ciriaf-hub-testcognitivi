import { describe, it, expect } from 'vitest';
import { pickTier } from './tier';

describe('pickTier', () => {
  it('should_pick_the_mobile_tier_on_phones', () => {
    expect(pickTier(390).name).toBe('mobile');
  });

  it('should_pick_the_desktop_tier_on_wide_screens_with_many_cores', () => {
    expect(pickTier(1920, 12).name).toBe('desktop');
  });

  it('should_cap_weak_desktops_at_the_tablet_tier', () => {
    expect(pickTier(1920, 4).name).toBe('tablet');
  });

  it('should_use_fewer_particles_on_lower_tiers', () => {
    expect(pickTier(390).count).toBeLessThan(pickTier(1920, 12).count);
  });
});

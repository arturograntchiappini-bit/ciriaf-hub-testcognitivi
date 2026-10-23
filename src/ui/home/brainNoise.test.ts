import { describe, it, expect } from 'vitest';
import { fbm, foliaShade, gyralShade, valueNoise } from './brainNoise';

describe('brainNoise', () => {
  it('should_return_the_same_value_for_the_same_point', () => {
    expect(valueNoise(1.3, 2.7, -0.4)).toBe(valueNoise(1.3, 2.7, -0.4));
  });

  it('should_keep_noise_and_shades_inside_the_unit_interval', () => {
    for (let i = 0; i < 200; i++) {
      const [x, y, z] = [Math.sin(i) * 1.2, Math.cos(i * 1.7) * 0.7, Math.sin(i * 0.3) * 1.1];
      for (const value of [valueNoise(x, y, z), fbm(x, y, z), gyralShade(x, y, z), foliaShade(x, y, z)]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });

  it('should_produce_both_sulci_and_crests_across_the_cortex', () => {
    const shades: number[] = [];
    for (let i = 0; i < 600; i++) shades.push(gyralShade(Math.sin(i * 0.9) * 0.9, Math.cos(i * 0.41) * 0.6, Math.sin(i * 0.23) * 1.1));
    expect(Math.min(...shades)).toBeLessThan(0.2);
    expect(Math.max(...shades)).toBeGreaterThan(0.9);
  });
});

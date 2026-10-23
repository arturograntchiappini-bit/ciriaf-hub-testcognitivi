import { describe, it, expect } from 'vitest';
import { buildBrainCloud, buildEdgeBuffers, REGION_COUNT } from './brainCloud';

const OPTIONS = { count: 1200, nodeCount: 300 };

describe('brainCloud', () => {
  it('should_build_the_same_cloud_for_the_same_seed', () => {
    const a = buildBrainCloud(OPTIONS);
    const b = buildBrainCloud(OPTIONS);
    expect(Array.from(a.positions)).toEqual(Array.from(b.positions));
    expect(a.edges).toEqual(b.edges);
  });

  it('should_keep_every_point_inside_a_brain_sized_box', () => {
    const { positions } = buildBrainCloud(OPTIONS);
    for (let i = 0; i < positions.length; i += 3) {
      expect(Math.abs(positions[i] as number)).toBeLessThan(1.3);
      expect(Math.abs(positions[i + 1] as number)).toBeLessThan(1.3);
      expect(Math.abs(positions[i + 2] as number)).toBeLessThan(1.5);
    }
  });

  it('should_assign_every_one_of_the_five_regions_to_some_points', () => {
    const { regions } = buildBrainCloud(OPTIONS);
    const present = new Set(Array.from(regions));
    expect(present.size).toBe(REGION_COUNT);
  });

  it('should_keep_the_midline_nearly_empty_except_for_the_corpus_callosum_and_the_stem', () => {
    const { positions, regions } = buildBrainCloud({ count: 4000, nodeCount: 100 });
    let nearMidline = 0;
    for (let i = 0; i < regions.length; i++) {
      if (regions[i] !== 4 && Math.abs(positions[i * 3] as number) < 0.03) nearMidline++;
    }
    expect(nearMidline / regions.length).toBeLessThan(0.05);
  });

  it('should_build_edges_between_distinct_valid_nodes_without_duplicates', () => {
    const { edges, nodeCount } = buildBrainCloud(OPTIONS);
    const keys = edges.map(([a, b]) => `${Math.min(a, b)}-${Math.max(a, b)}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(edges.every(([a, b]) => a !== b && a < nodeCount && b < nodeCount)).toBe(true);
    expect(edges.length).toBeGreaterThan(nodeCount);
  });

  it('should_lay_out_two_vertices_per_edge_that_share_the_same_pulse_seed', () => {
    const cloud = buildBrainCloud(OPTIONS);
    const buffers = buildEdgeBuffers(cloud);
    expect(buffers.vertexCount).toBe(cloud.edges.length * 2);
    expect(Array.from(buffers.along.slice(0, 4))).toEqual([0, 1, 0, 1]);
    expect(buffers.seeds[0]).toBe(buffers.seeds[2]);
    expect(buffers.seeds[1]).toBe(buffers.seeds[3]);
  });
});

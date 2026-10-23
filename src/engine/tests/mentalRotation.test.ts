import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../rng';
import type { TrialResult, ValidationFlag } from '../types';
import {
  conditionLabel,
  generateMentalRotation,
  generateShape,
  isChiral,
  mirror,
  projectFaces,
  ROTATION_ANGLES,
  rotationSlope,
  scoreMentalRotation,
  type Cube,
  type MentalRotationParams,
} from './mentalRotation';

const PARAMS: MentalRotationParams = { nTrials: 84, fixationMs: 500, responseWindowMs: 8000, isiMinMs: 700, isiMaxMs: 1100, practiceTrials: 6 };

function trial(condition: string, rtMs: number | null, over: Partial<TrialResult> = {}): TrialResult {
  const flag: ValidationFlag = rtMs === null ? 'OMISSION' : 'VALID';
  return {
    testId: 'mentalRotation', sessionId: 'M-0', trialIndex: 0, phase: 'test', condition, stimulus: condition,
    response: rtMs === null ? null : 'arrowleft', correct: rtMs !== null, rtMs, flag, onsetTimestamp: 0, ...over,
  };
}
const metric = (trials: TrialResult[], label: string): string | number | undefined =>
  scoreMentalRotation(trials).find((m) => m.label === label)?.value;

describe('generateShape', () => {
  it('should_build_a_connected_figure_of_ten_distinct_cubes', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const cubes = generateShape(mulberry32(seed));
      expect(new Set(cubes.map((c) => c.join(','))).size).toBe(10);
      cubes.slice(1).forEach((c, i) => {
        const p = cubes[i] as Cube;
        expect(Math.abs(c[0] - p[0]) + Math.abs(c[1] - p[1]) + Math.abs(c[2] - p[2])).toBe(1);
      });
    }
  });

  it('should_never_be_superimposable_on_its_mirror_image', () => {
    for (let seed = 1; seed <= 30; seed++) expect(isChiral(generateShape(mulberry32(seed)))).toBe(true);
  });
});

describe('isChiral', () => {
  it('should_reject_a_straight_bar_that_has_a_mirror_plane', () => {
    expect(isChiral([[0, 0, 0], [1, 0, 0], [2, 0, 0]])).toBe(false);
  });
  it('should_agree_on_a_figure_and_its_mirror_image', () => {
    const shape = generateShape(mulberry32(11));
    expect(isChiral(mirror(shape))).toBe(isChiral(shape));
  });
});

describe('generateMentalRotation', () => {
  it('should_balance_angle_and_sameness_with_84_trials', () => {
    const seq = generateMentalRotation(PARAMS, mulberry32(1));
    expect(seq).toHaveLength(84);
    for (const angle of ROTATION_ANGLES)
      for (const same of [true, false])
        expect(seq.filter((s) => Math.abs(s.angle) === angle && s.same === same)).toHaveLength(6);
  });

  it('should_use_the_same_figure_when_same_and_its_mirror_when_different', () => {
    for (const s of generateMentalRotation(PARAMS, mulberry32(2))) {
      expect(s.right).toEqual(s.same ? s.left : mirror(s.left));
    }
  });

  it('should_be_deterministic_for_the_same_seed', () => {
    expect(generateMentalRotation(PARAMS, mulberry32(7))).toEqual(generateMentalRotation(PARAMS, mulberry32(7)));
  });
});

describe('projectFaces', () => {
  it('should_show_three_faces_of_a_single_cube', () => {
    expect(projectFaces([[0, 0, 0]], 0)).toHaveLength(3);
  });
  it('should_hide_faces_shared_between_two_cubes', () => {
    expect(projectFaces([[0, 0, 0], [1, 0, 0]], 0).length).toBeLessThan(6);
  });
  it('should_return_quadrilaterals_with_shade_in_unit_range', () => {
    for (const face of projectFaces(generateShape(mulberry32(3)), 60)) {
      expect(face.points).toHaveLength(4);
      expect(face.shade).toBeGreaterThanOrEqual(0);
      expect(face.shade).toBeLessThanOrEqual(1);
    }
  });
  it('should_keep_every_figure_inside_the_drawing_field_at_any_angle', () => {
    const FIELD = 4.6; // semi-ampiezza usata da MentalRotationView
    let widest = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const cubes = generateShape(mulberry32(seed));
      for (const angle of ROTATION_ANGLES) {
        for (const face of projectFaces(cubes, angle)) for (const [x, y] of face.points) widest = Math.max(widest, Math.abs(x), Math.abs(y));
      }
    }
    expect(widest).toBeLessThan(FIELD);
  });
  it('should_change_the_projection_when_the_figure_is_rotated', () => {
    const cubes = generateShape(mulberry32(4));
    expect(projectFaces(cubes, 0)).not.toEqual(projectFaces(cubes, 90));
  });
});

describe('scoreMentalRotation', () => {
  const linear = (slope: number): TrialResult[] => ROTATION_ANGLES.map((a) => trial(conditionLabel(true, a), 600 + slope * a));

  it('should_report_the_slope_in_ms_per_degree_and_the_rotation_speed', () => {
    const trials = linear(10);
    expect(rotationSlope(trials)?.slope).toBeCloseTo(10);
    expect(metric(trials, 'Pendenza RT × angolo (coppie uguali)')).toBe(10);
    expect(metric(trials, 'Intercetta RT (coppie uguali)')).toBe(600);
    expect(metric(trials, 'Velocità di rotazione mentale')).toBe(100);
  });

  it('should_treat_negative_angles_like_positive_ones', () => {
    expect(conditionLabel(true, -90)).toBe('same-90');
  });

  it('should_use_only_same_pairs_for_the_slope', () => {
    const trials = [...linear(10), trial(conditionLabel(false, 0), 5000), trial(conditionLabel(false, 180), 100)];
    expect(rotationSlope(trials)?.slope).toBeCloseTo(10);
  });

  it('should_report_dashes_when_the_slope_is_not_defined', () => {
    const trials = [trial(conditionLabel(true, 0), 600)];
    expect(metric(trials, 'Pendenza RT × angolo (coppie uguali)')).toBe('—');
    expect(metric(trials, 'Velocità di rotazione mentale')).toBe('—');
  });

  it('should_count_omissions_as_errors_and_exclude_interrupted_trials', () => {
    const trials = [
      trial(conditionLabel(true, 30), 700),
      trial(conditionLabel(false, 30), null),
      trial(conditionLabel(true, 60), null, { flag: 'INTERRUPTED' }),
    ];
    expect(metric(trials, 'Accuratezza complessiva')).toBe(50);
    expect(metric(trials, 'Errori di omissione')).toBe(1);
  });
});

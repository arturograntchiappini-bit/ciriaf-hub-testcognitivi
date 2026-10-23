import { describe, it, expect } from 'vitest';
import { escapeHtml, formatFilename, toEventsTsv, toHtmlReport, toSummaryCsv, toTrialsCsv } from './exportFormats';
import type { TestResult, TrialResult } from './types';

const trial = (i: number, over: Partial<TrialResult>): TrialResult => ({
  testId: 'gonogo', sessionId: 'AB-1', trialIndex: i, phase: 'test', condition: 'go', stimulus: 'go',
  response: ' ', correct: true, rtMs: 400.4, flag: 'VALID', onsetTimestamp: 5000 + i * 1000, ...over,
});

const result: TestResult = {
  testId: 'gonogo', sessionId: 'AB-1', startedAt: '2026-10-23T10:00:00.000Z', params: { nTrials: 2 },
  trials: [trial(0, {}), trial(1, { condition: 'nogo', response: null, rtMs: null, stimulus: 'a\tb' })],
  summary: [{ label: 'RT medio', value: 400.4, unit: 'ms' }, { label: 'Note; con separatore', value: 'x' }],
};

describe('toTrialsCsv', () => {
  it('should_use_comma_separator_for_the_international_locale', () => {
    const lines = toTrialsCsv(result, 'intl').split('\r\n');
    expect(lines[0]).toBe('test,session_id,trial_index,fase,condizione,stimolo,risposta,corretto,rt_ms,flag_validazione,timestamp_onset');
    expect(lines).toHaveLength(3);
  });
  it('should_keep_semicolon_for_the_italian_locale', () => {
    expect(toTrialsCsv(result, 'it').split('\r\n')[0]).toContain(';');
  });
});

describe('toSummaryCsv', () => {
  it('should_write_one_row_per_metric_with_decimal_comma_in_italian', () => {
    const lines = toSummaryCsv(result, 'it').split('\r\n');
    expect(lines[0]).toBe('test;session_id;metrica;valore;unita');
    expect(lines[1]).toBe('gonogo;AB-1;RT medio;400,4;ms');
    expect(lines[2]).toBe('gonogo;AB-1;"Note; con separatore";x;');
  });
  it('should_use_decimal_point_in_the_international_locale', () => {
    const lines = toSummaryCsv(result, 'intl').split('\r\n');
    expect(lines[1]).toBe('gonogo,AB-1,RT medio,400.4,ms');
    expect(lines[2]).toBe('gonogo,AB-1,Note; con separatore,x,');
  });
});

describe('toEventsTsv', () => {
  it('should_use_seconds_relative_to_the_first_trial_and_na_for_missing_values', () => {
    const rows = toEventsTsv(result).split('\n').map((l) => l.split('\t'));
    expect(rows[0]?.slice(0, 4)).toEqual(['onset', 'duration', 'trial_type', 'response_time']);
    expect(rows[1]?.slice(0, 4)).toEqual(['0', 'n/a', 'go', '0.4']);
    expect(rows[2]?.slice(0, 5)).toEqual(['1', 'n/a', 'nogo', 'n/a', 'n/a']);
  });
  it('should_strip_tabs_from_cell_values', () => {
    expect(toEventsTsv(result).split('\n')[2]?.split('\t')).toHaveLength(9);
  });
});

describe('toHtmlReport', () => {
  it('should_escape_markup_in_titles_and_values', () => {
    const html = toHtmlReport({ ...result, summary: [{ label: '<b>x</b>', value: '"q"' }] }, 'T<script>', '2026-10-23');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
    expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;');
  });
  it('should_include_metrics_params_and_session_code', () => {
    const html = toHtmlReport(result, 'Go / No-Go', '2026-10-23');
    expect(html).toContain('400.4 ms');
    expect(html).toContain('nTrials');
    expect(html).toContain('AB-1');
  });
});

describe('formatFilename', () => {
  it('should_map_each_format_to_its_extension', () => {
    expect(formatFilename(result, 'events-tsv')).toMatch(/_events\.tsv$/);
    expect(formatFilename(result, 'csv-intl')).toMatch(/_intl\.csv$/);
    expect(formatFilename(result, 'html')).toMatch(/_report\.html$/);
  });
});

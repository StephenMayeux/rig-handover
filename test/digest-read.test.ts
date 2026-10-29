import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseLine, readNight } from '../src/digest/read.js';

describe('readNight on runs/2026-10-28', () => {
  const night = readNight('runs', '2026-10-28');

  it('folds the real night into 5 jobs, sorted, with 1 bad line', () => {
    expect(night).not.toBeNull();
    expect(night!.badLines).toBe(1);
    expect(night!.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });

  it('keeps a null owner', () => {
    expect(night!.rows.find((r) => r.job === 'digest/render')!.owner).toBeNull();
  });

  it('counts retries, takes the last status, keeps the offset', () => {
    const r = night!.rows.find((r) => r.job === 'fixtures/refresh')!;
    expect(r).toMatchObject({ runs: 4, retries: 3, lastStatus: 'ok', lastError: null });
    expect(r.firstAt).toBe('2026-10-29T01:30:00+01:00');
    expect(r.lastAt).toBe('2026-10-29T01:37:00+01:00');
  });

  it('keeps the last error', () => {
    const r = night!.rows.find((r) => r.job === 'notes/backup')!;
    expect(r).toMatchObject({ lastStatus: 'fail', lastError: 'quota exceeded' });
  });
});

describe('readNight in a temp dir', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('returns null for a missing night', () => {
    expect(readNight(dir, '2026-01-01')).toBeNull();
  });

  it('returns no rows for an empty file', () => {
    writeFileSync(join(dir, '2026-01-01.jsonl'), '');
    expect(readNight(dir, '2026-01-01')).toEqual({ rows: [], badLines: 0 });
  });

  it('counts bad lines and still reads the rest', () => {
    const lines = [
      '{"at":"2026-01-01T01:00:00+02:00","job":"b","status":"ok","owner":"x"}',
      'not json',
      '{"at":"2026-01-01T02:00:00+02:00","job":"a","status":"nope","owner":"x"}',
      '{"at":"2026-01-01T03:00:00+02:00","job":"a","status":"retry","owner":null,"error":"e"}',
    ];
    writeFileSync(join(dir, '2026-01-01.jsonl'), lines.join('\n') + '\n');
    const night = readNight(dir, '2026-01-01')!;
    expect(night.badLines).toBe(2);
    expect(night.rows.map((r) => r.job)).toEqual(['a', 'b']);
    expect(night.rows[0]).toMatchObject({ runs: 1, retries: 1, lastStatus: 'retry', lastError: 'e', owner: null });
  });
});

describe('parseLine', () => {
  it('rejects wrong shapes', () => {
    expect(parseLine('[]')).toBeNull();
    expect(parseLine('{"at":"t","job":"j","status":"ok"}')).toBeNull();
    expect(parseLine('{"at":"t","job":"j","status":"ok","owner":1}')).toBeNull();
    expect(parseLine('{"at":"t","job":"j","status":"ok","owner":null,"error":5}')).toBeNull();
  });

  it('accepts a valid line', () => {
    expect(parseLine('{"at":"t","job":"j","status":"fail","owner":"o","error":"x"}')).toEqual({
      at: 't',
      job: 'j',
      status: 'fail',
      owner: 'o',
      error: 'x',
    });
  });
});

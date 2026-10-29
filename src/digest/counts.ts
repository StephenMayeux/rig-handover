import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLine } from './read.js';
import type { RunStatus } from './types.js';

export type Counts = Record<RunStatus, number>;

// Run lines per status in a night's log; bad lines don't count. null = no file.
export function countNight(runsDir: string, night: string): Counts | null {
  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw e;
  }
  const counts: Counts = { ok: 0, retry: 0, fail: 0 };
  for (const raw of text.split('\n')) {
    const line = raw.trim() === '' ? null : parseLine(raw);
    if (line) counts[line.status]++;
  }
  return counts;
}

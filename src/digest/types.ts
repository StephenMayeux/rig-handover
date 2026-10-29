// Shapes for the night's run log (runs/<night>.jsonl) and its digest.

export type RunStatus = 'ok' | 'retry' | 'fail';

// One parsed log line. `at` keeps the log's offset.
export type RunLine = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

// One row per job. Views render null as "—". Times keep the log's offset, never UTC.
export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

// A night that has a file. An empty file gives rows: [] ("nothing ran").
export type Night = {
  rows: DigestRow[];
  badLines: number;
};

// null = no file for that night (404); otherwise the parsed night.
export type ReadNight = (runsDir: string, night: string) => Night | null;

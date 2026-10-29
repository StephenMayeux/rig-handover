import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

let dir: string;
let app: ReturnType<typeof createApp>;

const line = (at: string, job: string, status: string, owner: string | null = 'ana') =>
  JSON.stringify({ at, job, status, owner });

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
  writeFileSync(
    join(dir, '2026-01-01.jsonl'),
    [
      line('2026-01-01T01:00:00+01:00', 'zeta-job', 'ok'),
      line('2026-01-01T02:00:00+01:00', 'alpha-job', 'ok'),
      line('2026-01-01T03:00:00+01:00', 'alpha-job', 'fail'),
    ].join('\n') + '\n',
  );
  writeFileSync(join(dir, '2026-01-02.jsonl'), '');
  writeFileSync(
    join(dir, '2026-01-03.jsonl'),
    [line('2026-01-03T01:00:00+01:00', 'solo-job', 'ok'), 'not json at all'].join('\n') + '\n',
  );
  app = createApp({
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir: dir,
  });
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

type Api = { night: string; rows: { job: string }[]; badLines: number };

describe('digest routes', () => {
  it('200 for a night on disk, page and JSON in the same order', async () => {
    const page = await app.request('/digest/2026-01-01');
    const html = await page.text();
    expect(page.status).toBe(200);
    expect(html).toContain('alpha-job');
    expect(html).toContain('zeta-job');

    const api = await app.request('/api/digest/2026-01-01');
    const body = (await api.json()) as Api;
    expect(api.status).toBe(200);
    expect(body.night).toBe('2026-01-01');
    const jobs = body.rows.map((r) => r.job);
    expect(jobs).toEqual(['alpha-job', 'zeta-job']);
    const pos = jobs.map((j) => html.indexOf(j));
    expect(pos).toEqual([...pos].sort((a, b) => a - b));
  });

  it.each(['2026-02-02', '../x', 'nope'])('404 for %s on both routes', async (night) => {
    const page = await app.request(`/digest/${night}`);
    const api = await app.request(`/api/digest/${night}`);
    expect(page.status).toBe(404);
    expect(api.status).toBe(404);
  });

  it('empty night says nothing ran, rows is []', async () => {
    const page = await app.request('/digest/2026-01-02');
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('nothing ran');
    const api = await app.request('/api/digest/2026-01-02');
    const body = (await api.json()) as Api;
    expect(api.status).toBe(200);
    expect(body.rows).toEqual([]);
  });

  it('a bad line still gives 200, counted and noted', async () => {
    const page = await app.request('/digest/2026-01-03');
    const html = await page.text();
    expect(page.status).toBe(200);
    expect(html).toContain('solo-job');
    expect(html).toMatch(/1 line didn(&#39;|')t parse/);
    const api = await app.request('/api/digest/2026-01-03');
    const body = (await api.json()) as Api;
    expect(api.status).toBe(200);
    expect(body.badLines).toBe(1);
  });
});

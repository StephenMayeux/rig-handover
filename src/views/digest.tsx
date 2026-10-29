import type { DigestRow, Night } from '../digest/types.js';

const dash = '—';

function Row({ row }: { row: DigestRow }) {
  const failed = row.lastStatus === 'fail';
  const retried = row.retries >= 3;
  return (
    <tr>
      <td>{row.job}</td>
      <td>{row.owner ?? dash}</td>
      <td>{row.runs}</td>
      <td class={retried ? 'warn' : undefined}>{row.retries}</td>
      <td class={failed ? 'warn' : undefined}>{row.lastStatus}</td>
      <td>{row.lastError ?? dash}</td>
      <td>{row.firstAt}</td>
      <td>{row.lastAt}</td>
    </tr>
  );
}

export function DigestPage({ night, data }: { night: string; data: Night }) {
  return (
    <>
      <h1>digest · {night}</h1>
      {data.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first</th>
              <th>last</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <Row row={row} />
            ))}
          </tbody>
        </table>
      )}
      {data.badLines > 0 && (
        <p class="mute">
          {data.badLines} {data.badLines === 1 ? "line didn't" : "lines didn't"} parse
        </p>
      )}
    </>
  );
}

export function DigestMissing({ night }: { night: string }) {
  return (
    <>
      <h1>digest · {night}</h1>
      <p class="mute">no run log for {night}</p>
    </>
  );
}

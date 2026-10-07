/** Text alternative of a chart: the same numbers as a table, folded away until asked for. */
export function ChartTable({ caption, headers, rows }: { caption: string; headers: string[]; rows: string[][] }) {
  return (
    <details className="progress-table rounded-2xl bg-brand/10 px-3 py-2">
      <summary className="flex min-h-12 cursor-pointer items-center text-lg font-bold text-brand-dark">Veure les dades en taula</summary>
      <div className="max-h-80 overflow-auto">
        <table className="w-full border-collapse text-left text-base">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h} scope="col" className="border-b-2 border-ink/20 py-1 pr-3 font-bold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[0]}>
                {row.map((cell, i) =>
                  i === 0 ? (
                    <th key={i} scope="row" className="py-1 pr-3 font-semibold">
                      {cell}
                    </th>
                  ) : (
                    <td key={i} className="py-1 pr-3">
                      {cell}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

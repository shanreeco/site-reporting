export default function DataTable({
  columns,
  rows,
  onDelete,
  maxRows,
  caption,
  loading = false,
  error = "",
  getRowId,
}) {
  const showActions = typeof onDelete === "function";
  const allRows = Array.isArray(rows) ? rows : [];
  const displayRows = maxRows ? allRows.slice(0, maxRows) : allRows;

  const renderStatusRow = (message, opts = {}) => (
    <tr>
      <td
        colSpan={columns.length + (showActions ? 1 : 0)}
        className={["px-4 py-8 text-center text-sm", opts.className].filter(Boolean).join(" ")}
        role="status"
        aria-live={opts.live || "polite"}
      >
        {message}
      </td>
    </tr>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white/90 shadow-sm backdrop-blur-sm dark:border-neutral-700/70 dark:bg-neutral-900/70">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200/80 text-sm dark:divide-neutral-700/80">
            {caption && (
              <caption className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-200">
                {caption}
              </caption>
            )}
            <thead className="bg-neutral-100/80 text-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-200">
              <tr>
                {columns.map((c) => (
                  <th
                    key={c}
                    scope="col"
                    className="whitespace-nowrap px-4 py-3 text-left font-semibold tracking-wide text-neutral-800 dark:text-neutral-50"
                  >
                    {c.replaceAll("_", " ")}
                  </th>
                ))}
                {showActions && (
                  <th
                    scope="col"
                    className="px-4 py-3 text-right font-semibold text-neutral-800 dark:text-neutral-50"
                  >
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/70 dark:divide-neutral-800/70">
              {loading && renderStatusRow("Loading data…", { className: "text-neutral-600 dark:text-neutral-300" })}
              {!loading && error &&
                renderStatusRow(error, { className: "text-red-600 dark:text-red-400", live: "assertive" })}
              {!loading && !error &&
                displayRows.map((row, rowIndex) => {
                  const key = getRowId?.(row, rowIndex) ?? row?.id ?? rowIndex;
                  return (
                    <tr
                      key={key}
                      className="odd:bg-white even:bg-neutral-50 dark:odd:bg-neutral-900/70 dark:even:bg-neutral-800/60"
                    >
                      {columns.map((c) => (
                        <td key={c} className="whitespace-pre-wrap px-4 py-3 align-top text-neutral-800 dark:text-neutral-100">
                          {String(row?.[c] ?? "")}
                        </td>
                      ))}
                      {showActions && (
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => onDelete(row.id)}
                            className="rounded-full px-3 py-1 text-sm font-semibold text-red-700 underline-offset-4 transition hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500/70 dark:text-red-300"
                          >
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              {!loading && !error && displayRows.length === 0 &&
                renderStatusRow("No data available yet.", {
                  className: "text-neutral-600 dark:text-neutral-300",
                })}
            </tbody>
          </table>
        </div>
      </div>
      {maxRows && allRows.length > maxRows && (
        <p className="text-xs text-neutral-600 dark:text-neutral-300">
          Showing the latest {maxRows} of {allRows.length} records. Visit the workspace for the complete list.
        </p>
      )}
    </div>
  );
}

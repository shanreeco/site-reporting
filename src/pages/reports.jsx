import React, { useCallback, useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import { sampleReports } from "../services/sampleData";
import { MISCONFIGURED, supabase } from "../services/supabase";

function normalizeStatus(status) {
  return (status || "").toString().trim().toLowerCase();
}

function getDateValue(report, ...keys) {
  for (const key of keys) {
    const value = report?.[key];
    if (!value) continue;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function formatDate(date) {
  if (!date) return "Date pending";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const relativeFormatter =
  typeof Intl !== "undefined" && "RelativeTimeFormat" in Intl
    ? new Intl.RelativeTimeFormat(undefined, { numeric: "auto" })
    : null;

function formatRelative(date) {
  if (!date || !relativeFormatter) return "";
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (Math.abs(diffDays) >= 1) return relativeFormatter.format(diffDays, "day");
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  return relativeFormatter.format(diffHours, "hour");
}

function exportReportsToCsv(rows) {
  if (typeof window === "undefined" || !rows.length) return;
  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set()),
  );
  const escape = (value) => {
    if (value == null) return "";
    const stringValue = String(value).replace(/"/g, '""');
    return /[",\n]/.test(stringValue) ? `"${stringValue}"` : stringValue;
  };
  const csv = [headers.join(",")];
  rows.forEach((row) => {
    csv.push(headers.map((header) => escape(row[header])).join(","));
  });
  const blob = new Blob([csv.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `project-reports-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

const statusBadgeClasses = {
  pending: "text-amber-700 bg-amber-100",
  "in-progress": "text-blue-700 bg-blue-100",
  completed: "text-emerald-700 bg-emerald-100",
  delayed: "text-rose-700 bg-rose-100",
  "at-risk": "text-rose-700 bg-rose-100",
  default: "text-slate-600 bg-slate-100",
};

const healthBadgeClasses = {
  "on-track": "text-emerald-700 bg-emerald-100",
  upcoming: "text-blue-700 bg-blue-100",
  completed: "text-emerald-700 bg-emerald-100",
  "at-risk": "text-rose-700 bg-rose-100",
  default: "text-slate-600 bg-slate-100",
};

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeframe, setTimeframe] = useState("90");
  const [searchTerm, setSearchTerm] = useState("");

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      if (MISCONFIGURED) {
        setReports(sampleReports);
        setNotice(
          "Supabase credentials are not configured. Displaying curated sample reports.",
        );
        return;
      }

      const { data, error: queryError } = await supabase
        .from("reports")
        .select("*")
        .order("report_date", { ascending: false });

      if (queryError) throw queryError;
      setReports(data ?? []);
    } catch (err) {
      console.error("Failed to load reports", err);
      setError(err.message ?? "Unable to load reports");
      let fallbackApplied = false;
      setReports((current) => {
        if (current.length > 0) return current;
        if (sampleReports.length > 0) {
          fallbackApplied = true;
          return sampleReports;
        }
        return current;
      });
      if (fallbackApplied) {
        setNotice("Showing sample reports while we reconnect to the database.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const filteredReports = useMemo(() => {
    const now = new Date();
    const startWindow = timeframe === "all" ? null : new Date(now);
    if (startWindow) {
      startWindow.setDate(now.getDate() - Number(timeframe));
    }
    const term = searchTerm.trim().toLowerCase();
    return reports.filter((report) => {
      const status = normalizeStatus(report.status);
      if (statusFilter !== "all" && status !== statusFilter) {
        return false;
      }
      const reportDate = getDateValue(report, "report_date", "created_at", "date");
      if (startWindow && reportDate && reportDate < startWindow) {
        return false;
      }
      if (!term) return true;
      const haystack = [report?.project_name, report?.summary, report?.title, report?.submitted_by]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [reports, statusFilter, timeframe, searchTerm]);

  const statusBreakdown = useMemo(() => {
    const counts = new Map();
    reports.forEach((report) => {
      const status = normalizeStatus(report.status) || "unspecified";
      counts.set(status, (counts.get(status) || 0) + 1);
    });
    return counts;
  }, [reports]);

  const metrics = useMemo(() => {
    const projectIds = new Set();
    let recentReports = 0;
    let latestDate = null;
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    reports.forEach((report) => {
      if (report.project_id) {
        projectIds.add(report.project_id);
      } else if (report.project_name) {
        projectIds.add(report.project_name);
      }
      const reportDate = getDateValue(report, "report_date", "created_at", "date");
      if (reportDate) {
        if (!latestDate || reportDate > latestDate) latestDate = reportDate;
        if (reportDate >= thirtyDaysAgo) recentReports += 1;
      }
    });

    return {
      totalReports: reports.length,
      projectCount: projectIds.size,
      recentReports,
      lastUpdated: latestDate,
    };
  }, [reports]);

  const latestActivity = useMemo(() => {
    return [...filteredReports]
      .map((report) => ({
        report,
        date: getDateValue(report, "report_date", "created_at", "date"),
      }))
      .sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return b.date.getTime() - a.date.getTime();
      })
      .slice(0, 6);
  }, [filteredReports]);

  const handleExport = useCallback(() => {
    exportReportsToCsv(filteredReports);
  }, [filteredReports]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadReports}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={filteredReports.length === 0}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none"
            >
              Export CSV
            </button>
          </div>
        }
      />

      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="grid gap-6 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Total reports</p>
              <p className="mt-2 text-2xl font-semibold">{metrics.totalReports}</p>
              <p className="text-xs text-slate-500">Across all projects</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Projects covered</p>
              <p className="mt-2 text-2xl font-semibold">{metrics.projectCount}</p>
              <p className="text-xs text-slate-500">With at least one update</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Last 30 days</p>
              <p className="mt-2 text-2xl font-semibold">{metrics.recentReports}</p>
              <p className="text-xs text-slate-500">Reports submitted</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Last update</p>
              <p className="mt-2 text-2xl font-semibold">
                {metrics.lastUpdated ? formatDate(metrics.lastUpdated) : "No data"}
              </p>
              <p className="text-xs text-slate-500">
                {metrics.lastUpdated ? formatRelative(metrics.lastUpdated) : ""}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-4 md:items-end">
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In progress</option>
                <option value="completed">Completed</option>
                <option value="delayed">Delayed</option>
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Timeframe</span>
              <select
                value={timeframe}
                onChange={(event) => setTimeframe(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="180">Last 6 months</option>
                <option value="365">Last 12 months</option>
                <option value="all">All time</option>
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by project, author, or keywords"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setStatusFilter("all");
                setTimeframe("90");
                setSearchTerm("");
              }}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Reset filters
            </button>
          </div>

          {notice ? (
            <p className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              {notice}
            </p>
          ) : null}
          {error ? (
            <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </section>

        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Latest field reports</h2>
                  <p className="text-sm text-slate-500">
                    {filteredReports.length} report{filteredReports.length === 1 ? "" : "s"} in view
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-6">
                {loading ? (
                  <div className="grid gap-6 sm:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-48 animate-pulse rounded-3xl border border-slate-200 bg-white"
                      />
                    ))}
                  </div>
                ) : filteredReports.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 p-10 text-center">
                    <h3 className="text-lg font-semibold text-slate-900">No reports match your filters</h3>
                    <p className="mt-2 text-sm text-slate-600">
                      Try broadening your timeframe or clearing the search keywords to surface more
                      updates.
                    </p>
                  </div>
                ) : (
                  filteredReports.map((report) => {
                    const status = normalizeStatus(report.status);
                    const statusClasses = statusBadgeClasses[status] || statusBadgeClasses.default;
                    const health = normalizeStatus(report.health);
                    const healthClasses = healthBadgeClasses[health] || healthBadgeClasses.default;
                    const reportDate = getDateValue(report, "report_date", "created_at", "date");
                    return (
                      <article
                        key={report.id ?? `${report.project_name}-${report.report_date}`}
                        className="rounded-3xl border border-slate-200 bg-white/60 p-6 shadow-sm"
                      >
                        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">
                              {report.project_name || report.title || "Project update"}
                            </h3>
                            <p className="text-sm text-slate-500">
                              {report.submitted_by ? `Submitted by ${report.submitted_by}` : ""}
                              {report.submitted_by && reportDate ? " • " : ""}
                              {reportDate ? formatDate(reportDate) : "Date pending"}
                              {reportDate ? ` (${formatRelative(reportDate)})` : ""}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusClasses}`}
                            >
                              {status.replace(/-/g, " ") || "status"}
                            </span>
                            {report.health ? (
                              <span
                                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${healthClasses}`}
                              >
                                {report.health.replace(/-/g, " ")}
                              </span>
                            ) : null}
                          </div>
                        </header>

                        {report.summary ? (
                          <p className="mt-4 text-sm text-slate-600">{report.summary}</p>
                        ) : null}

                        <dl className="mt-4 grid gap-3 text-xs text-slate-500 sm:grid-cols-3">
                          {report.site_condition ? (
                            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 px-3 py-2">
                              <dt className="font-medium text-slate-600">Site condition</dt>
                              <dd>{report.site_condition}</dd>
                            </div>
                          ) : null}
                          {report.next_steps ? (
                            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 px-3 py-2">
                              <dt className="font-medium text-slate-600">Next steps</dt>
                              <dd>{report.next_steps}</dd>
                            </div>
                          ) : null}
                          {report.issues ? (
                            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 px-3 py-2">
                              <dt className="font-medium text-slate-600">Issues</dt>
                              <dd>{report.issues}</dd>
                            </div>
                          ) : null}
                        </dl>
                      </article>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Status overview</h2>
              <div className="mt-4 space-y-3">
                {Array.from(statusBreakdown.entries()).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between gap-3 text-sm text-slate-600">
                    <span className="capitalize">{status.replace(/-/g, " ")}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{count}</span>
                  </div>
                ))}
                {statusBreakdown.size === 0 ? (
                  <p className="text-sm text-slate-500">No reports available yet.</p>
                ) : null}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Recent activity</h2>
              <div className="mt-4 space-y-4">
                {latestActivity.length === 0 ? (
                  <p className="text-sm text-slate-500">No activity within the selected window.</p>
                ) : (
                  latestActivity.map(({ report, date }) => (
                    <div key={report.id ?? `${report.project_name}-${report.report_date}`}
                      className="rounded-2xl border border-slate-200/70 bg-slate-50/70 px-4 py-3">
                      <p className="text-sm font-medium text-slate-900">
                        {report.project_name || report.title || "Project update"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {date ? formatDate(date) : "Date pending"}
                        {date ? ` • ${formatRelative(date)}` : ""}
                      </p>
                      {report.summary ? (
                        <p className="mt-1 text-xs text-slate-600">
                          {report.summary.slice(0, 120)}
                          {report.summary.length > 120 ? "…" : ""}
                        </p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

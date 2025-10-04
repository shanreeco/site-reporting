import React from "react";
import { Link } from "react-router-dom";
import {
  DashboardTab,
  useTable,
  Card,
  DataTable,
} from "./reports.jsx";

function SectionTitle({ eyebrow, title, description }) {
  return (
    <header className="space-y-2 mb-6">
      {eyebrow && (
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-400">
          {eyebrow}
        </p>
      )}
      <h2 className="text-2xl md:text-3xl font-semibold text-slate-900">
        {title}
      </h2>
      {description && (
        <p className="text-base text-slate-600 max-w-3xl">{description}</p>
      )}
    </header>
  );
}

function PreviewCard({ title, subtitle, columns, rows, loading, error }) {
  return (
    <Card title={title} subtitle={subtitle} className="h-full">
      {loading ? (
        <div className="h-40 grid place-items-center text-sm text-slate-500">
          Loading latest entries…
        </div>
      ) : error ? (
        <div className="h-40 grid place-items-center px-4 text-center text-sm text-red-500">
          {error}
        </div>
      ) : (
        <DataTable columns={columns} rows={rows} />
      )}
    </Card>
  );
}

export default function HomePage() {
  const {
    rows: concreteRows,
    loading: concreteLoading,
    error: concreteError,
  } = useTable("concrete");
  const {
    rows: manpowerRows,
    loading: manpowerLoading,
    error: manpowerError,
  } = useTable("manpower");
  const {
    rows: issuesRows,
    loading: issuesLoading,
    error: issuesError,
  } = useTable("issues");
  const {
    rows: materialsRows,
    loading: materialsLoading,
    error: materialsError,
  } = useTable("materials");

  const top = React.useCallback((rows) => (rows ?? []).slice(0, 5), []);
  const totalWorkers = React.useMemo(
    () => manpowerRows.reduce((total, row) => total + Number(row.workers || 0), 0),
    [manpowerRows]
  );
  const openIssues = React.useMemo(
    () => issuesRows.filter((row) => row.status !== "Closed").length,
    [issuesRows]
  );
  const snapshotConcrete = concreteError ? "—" : concreteLoading ? "—" : concreteRows.length;
  const snapshotWorkers = manpowerError ? "—" : manpowerLoading ? "—" : totalWorkers;
  const snapshotIssues = issuesError ? "—" : issuesLoading ? "—" : openIssues;
  const dataErrors = React.useMemo(
    () => [concreteError, manpowerError, issuesError, materialsError].filter(Boolean),
    [concreteError, manpowerError, issuesError, materialsError]
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900" />
        <div className="absolute -top-32 right-20 h-72 w-72 rounded-full bg-indigo-500/40 blur-3xl" />
        <div className="absolute bottom-0 left-10 h-72 w-72 rounded-full bg-cyan-500/30 blur-3xl" />
      </div>

      <nav className="relative z-10 max-w-6xl mx-auto px-6 py-6 flex items-center gap-6">
        <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500 text-white">
            SR
          </span>
          Site Reporting
        </div>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <Link
            to="/app"
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 font-medium text-white backdrop-blur transition hover:bg-white/20"
          >
            Sign in
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H9"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5H9A2.25 2.25 0 006.75 6.75v10.5A2.25 2.25 0 009 19.5h3"
              />
            </svg>
          </Link>
        </div>
      </nav>

      <main className="relative z-10">
        <section className="px-6 py-16">
          <div className="max-w-6xl mx-auto grid gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,420px)] items-center">
            <div className="space-y-6">
              <p className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-indigo-200">
                Real-time project health
              </p>
              <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
                A modern command center for your site reporting
              </h1>
              <p className="text-lg text-slate-300">
                Track pours, manpower, material requests, and issues in a single
                cohesive workspace. Share progress with stakeholders and dive into
                the detail when needed.
              </p>
              {dataErrors.length > 0 && (
                <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  Unable to load some datasets right now: {dataErrors[0]}
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/app"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-indigo-500/30 transition hover:-translate-y-0.5 hover:bg-slate-100"
                >
                  Open reporting app
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    className="h-4 w-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H9"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4.5H9A2.25 2.25 0 006.75 6.75v10.5A2.25 2.25 0 009 19.5h3"
                    />
                  </svg>
                </Link>
                <a
                  href="#live-data"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  View live data
                </a>
              </div>
            </div>
            <Card
              title="Today's Snapshot"
              subtitle="Automatically updated from the field"
              className="bg-white/90 text-slate-900 shadow-2xl"
            >
              <ul className="space-y-4 text-sm text-slate-600">
                <li className="flex items-center justify-between rounded-xl bg-slate-100 px-4 py-3">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-500">
                      Concrete pours
                    </p>
                    <p className="text-base font-semibold text-slate-900">
                      {snapshotConcrete}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-indigo-600">Live</span>
                </li>
                <li className="flex items-center justify-between rounded-xl bg-slate-100 px-4 py-3">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-500">
                      Crew on site
                    </p>
                    <p className="text-base font-semibold text-slate-900">
                      {snapshotWorkers}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-indigo-600">Today</span>
                </li>
                <li className="flex items-center justify-between rounded-xl bg-slate-100 px-4 py-3">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-500">
                      Open issues
                    </p>
                    <p className="text-base font-semibold text-slate-900">
                      {snapshotIssues}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-indigo-600">Needs attention</span>
                </li>
              </ul>
            </Card>
          </div>
        </section>

        <section id="live-data" className="bg-white text-slate-900 py-16">
          <div className="max-w-6xl mx-auto px-6">
            <SectionTitle
              eyebrow="Live insights"
              title="Every stakeholder can explore the latest data"
              description="Charts and tables update instantly from the field, allowing managers and partners to track progress even without an account."
            />
            <DashboardTab />
          </div>
        </section>

        <section className="bg-slate-50 text-slate-900 py-16">
          <div className="max-w-6xl mx-auto px-6 space-y-10">
            <SectionTitle
              eyebrow="Detailed records"
              title="Browse the latest entries from every log"
              description="Dive into the most recent records for pours, manpower, materials, and site issues. Sign in for full editing capabilities."
            />
            <div className="grid gap-6 lg:grid-cols-2">
              <PreviewCard
                title="Concrete log"
                subtitle="Last 5 entries"
                columns={["date", "location", "element", "volume", "supplier"]}
                rows={top(concreteRows)}
                loading={concreteLoading}
                error={concreteError}
              />
              <PreviewCard
                title="Manpower log"
                subtitle="Last 5 entries"
                columns={["date", "contractor", "trade", "workers", "zone"]}
                rows={top(manpowerRows)}
                loading={manpowerLoading}
                error={manpowerError}
              />
              <PreviewCard
                title="Material tracker"
                subtitle="Last 5 entries"
                columns={["date", "item", "type", "status", "needed_by"]}
                rows={top(materialsRows)}
                loading={materialsLoading}
                error={materialsError}
              />
              <PreviewCard
                title="Site issues"
                subtitle="Last 5 entries"
                columns={["date", "location", "severity", "status", "owner"]}
                rows={top(issuesRows)}
                loading={issuesLoading}
                error={issuesError}
              />
            </div>
            <div className="flex justify-center pt-4">
              <Link
                to="/app"
                className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/40 transition hover:-translate-y-0.5 hover:bg-indigo-500"
              >
                Sign in to manage entries
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className="h-4 w-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H9"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5H9A2.25 2.25 0 006.75 6.75v10.5A2.25 2.25 0 009 19.5h3"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 bg-slate-950/80 py-10 text-sm text-slate-400">
        <div className="max-w-6xl mx-auto px-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p>&copy; {new Date().getFullYear()} Site Reporting. All rights reserved.</p>
          <p className="text-slate-500">Built for transparent, data-led site management.</p>
        </div>
      </footer>
    </div>
  );
}

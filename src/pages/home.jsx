import React from "react";
import { Link } from "react-router-dom";
import Card from "../components/Card";
import DataTable from "../components/DataTable";
import { useTable } from "../hooks/useTable";
import { usePublicDailyTasks } from "../hooks/usePublicDailyTasks";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

const COLORS = ["#111827", "#6b7280", "#2563eb", "#10b981", "#f59e0b", "#ef4444"];

const DAILY_TASK_STATUS_STYLES = {
  completed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
  ongoing:
    "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200",
  rejected:
    "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200",
};

function formatDateLabel(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
      new Date(`${value}T00:00:00`)
    );
  } catch (error) {
    return value;
  }
}

function formatDateTimeLabel(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch (error) {
    return value;
  }
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
    rows: materialRows,
    loading: materialLoading,
    error: materialError,
  } = useTable("materials");
  const {
    rows: bbsRows,
    loading: bbsLoading,
    error: bbsError,
  } = useTable("bbs_schedule");
  const {
    tasks: publicDailyTasks,
    date: publicDailyTasksDate,
    loading: publicDailyTasksLoading,
    error: publicDailyTasksError,
    refresh: refreshPublicDailyTasks,
    hasData: hasPublicDailyTasks,
  } = usePublicDailyTasks();

  const concreteData = React.useMemo(() => {
    const byDate = {};
    for (const row of concreteRows) {
      const date = row.date || "";
      const volume = parseFloat(row.volume) || 0;
      byDate[date] = (byDate[date] || 0) + volume;
    }
    return Object.entries(byDate).map(([date, volume]) => ({ date, volume }));
  }, [concreteRows]);

  const manpowerData = React.useMemo(() => {
    const byDate = {};
    for (const row of manpowerRows) {
      const date = row.date || "";
      const workers = parseFloat(row.workers) || 0;
      byDate[date] = (byDate[date] || 0) + workers;
    }
    return Object.entries(byDate).map(([date, workers]) => ({ date, workers }));
  }, [manpowerRows]);

  const materialsByStatus = React.useMemo(() => {
    const byStatus = {};
    for (const row of materialRows) {
      const status = row.status || "Unknown";
      byStatus[status] = (byStatus[status] || 0) + 1;
    }
    return Object.entries(byStatus).map(([name, value]) => ({ name, value }));
  }, [materialRows]);

  const bbsDeliveryData = React.useMemo(() => {
    const byDate = {};
    for (const row of bbsRows) {
      const date = row.delivery_date || "";
      const weight = parseFloat(row.weight_tons) || 0;
      byDate[date] = (byDate[date] || 0) + weight;
    }
    return Object.entries(byDate).map(([date, weight]) => ({ date, weight }));
  }, [bbsRows]);

  const totalConcrete = React.useMemo(
    () => concreteRows.reduce((sum, row) => sum + (parseFloat(row.volume) || 0), 0),
    [concreteRows]
  );
  const totalWorkers = React.useMemo(
    () => manpowerRows.reduce((sum, row) => sum + (parseFloat(row.workers) || 0), 0),
    [manpowerRows]
  );
  const activeIssues = React.useMemo(
    () => issuesRows.filter((row) => (row.status || "").toLowerCase() !== "closed").length,
    [issuesRows]
  );
  const activeMaterials = React.useMemo(
    () =>
      materialRows.filter((row) => {
        const status = (row.status || "").toLowerCase();
        return ["pending", "approved", "ordered"].includes(status);
      }).length,
    [materialRows]
  );
  const upcomingBbsDeliveries = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return bbsRows.filter((row) => {
      const value = row.delivery_date;
      if (!value) return false;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return false;
      return date >= today;
    });
  }, [bbsRows]);
  const upcomingBbsCount = upcomingBbsDeliveries.length;
  const upcomingBbsWeight = React.useMemo(
    () =>
      upcomingBbsDeliveries.reduce(
        (sum, row) => sum + (parseFloat(row.weight_tons) || 0),
        0
      ),
    [upcomingBbsDeliveries]
  );
  const publicDailyTasksDateLabel = React.useMemo(
    () => formatDateLabel(publicDailyTasksDate),
    [publicDailyTasksDate]
  );
  const publicDailyTasksSummary = React.useMemo(() => {
    if (!publicDailyTasks.length) {
      return "No daily tasks are currently published.";
    }
    const preview = publicDailyTasks.slice(0, 6).map((task) => {
      const status = task.status
        ? task.status.charAt(0).toUpperCase() + task.status.slice(1)
        : "Unknown";
      const updatedAtLabel = formatDateTimeLabel(task.updated_at);
      const profile = task.updated_by_profile || {};
      const name = profile.full_name?.trim() || profile.email || "";
      const updatedInfo = [updatedAtLabel, name ? `by ${name}` : ""]
        .filter(Boolean)
        .join(" ");
      return `${task.title} – ${status}${updatedInfo ? ` (${updatedInfo})` : ""}`;
    });
    return preview.join("; ");
  }, [publicDailyTasks]);

  const summarizeSeries = React.useCallback((data, labelKey, valueKey, valueLabel) => {
    if (!data.length) return "No data available.";
    const preview = data.slice(0, 5);
    const parts = preview.map((item) => {
      const label = item?.[labelKey] ?? "Unknown";
      const value = item?.[valueKey] ?? 0;
      return `${label}: ${value}${valueLabel ? ` ${valueLabel}` : ""}`;
    });
    return `${parts.join("; ")}${data.length > preview.length ? "; additional data available" : ""}`;
  }, []);

  const summarizePie = React.useCallback((data) => {
    if (!data.length) return "No data available.";
    return data
      .map((item) => `${item.name}: ${item.value}`)
      .join("; ");
  }, []);

  const concreteSummary = summarizeSeries(concreteData, "date", "volume", "m³");
  const manpowerSummary = summarizeSeries(manpowerData, "date", "workers", "workers");
  const materialSummary = summarizePie(materialsByStatus);
  const bbsDeliverySummary = summarizeSeries(bbsDeliveryData, "date", "weight", "t");

  const heroIsLoading =
    concreteLoading || manpowerLoading || issuesLoading || materialLoading || bbsLoading;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-neutral-100 via-white to-neutral-200 text-neutral-900 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 dark:text-neutral-100">
      <a
        href="#main-content"
        className="absolute left-4 top-4 z-50 inline-flex -translate-y-20 rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-lg transition focus-visible:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white dark:bg-neutral-100 dark:text-neutral-900"
      >
        Skip to main content
      </a>
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute left-1/2 top-24 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-neutral-300/40 blur-3xl dark:bg-neutral-800/40" />
        <div className="absolute right-10 top-72 h-64 w-64 rounded-full bg-neutral-200/40 blur-3xl dark:bg-neutral-700/40" />
      </div>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6" role="banner">
        <Link
          to="/"
          className="text-lg font-semibold tracking-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700 dark:focus-visible:outline-neutral-200"
        >
          FieldSight
        </Link>
        <nav className="flex items-center gap-3 text-sm font-medium" aria-label="Primary">
          <Link
            to="/app"
            className="rounded-full border border-neutral-300/80 bg-white/90 px-4 py-2 text-neutral-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700 dark:border-neutral-700/70 dark:bg-neutral-900/80 dark:text-neutral-100 dark:focus-visible:outline-neutral-200"
          >
            Open workspace
          </Link>
        </nav>
      </header>

      <main id="main-content" className="mx-auto grid w-full max-w-6xl gap-12 px-6 pb-20" role="main">
        <section className="grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div className="space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400">
              Daily operations at a glance
            </p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Insightful site reporting for every stakeholder.
            </h1>
            <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              Monitor pours, manpower, issues and material movements in one consolidated, real-time view. Share progress with your teams even before logging in.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/app"
                className="inline-flex items-center justify-center rounded-full bg-neutral-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-neutral-900/10 transition hover:-translate-y-1 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white dark:bg-neutral-100 dark:text-neutral-900 dark:focus-visible:outline-neutral-200"
              >
                Launch secure workspace
              </Link>
              <a
                href="#reports"
                className="inline-flex items-center justify-center rounded-full border border-neutral-300/80 bg-white/80 px-5 py-3 text-sm font-semibold text-neutral-800 shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700 dark:border-neutral-700/80 dark:bg-neutral-900/70 dark:text-neutral-100 dark:focus-visible:outline-neutral-200"
              >
                Explore live data
              </a>
            </div>
          </div>
          <Card title="Today’s highlights" className="!p-8">
            <dl className="grid grid-cols-1 gap-6 text-sm sm:grid-cols-2" aria-live="polite">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-600 dark:text-neutral-300">
                  Concrete poured
                </dt>
                <dd className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                  {heroIsLoading
                    ? "Loading…"
                    : `${totalConcrete.toLocaleString(undefined, {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })} m³`}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-600 dark:text-neutral-300">
                  Workforce logged
                </dt>
                <dd className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                  {heroIsLoading ? "Loading…" : totalWorkers.toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-600 dark:text-neutral-300">
                  Open issues
                </dt>
                <dd className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                  {heroIsLoading ? "Loading…" : activeIssues}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-600 dark:text-neutral-300">
                  Active orders
                </dt>
                <dd className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                  {heroIsLoading ? "Loading…" : activeMaterials}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-600 dark:text-neutral-300">
                  Upcoming BBS drops
                </dt>
                <dd className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                  {heroIsLoading
                    ? "Loading…"
                    : `${upcomingBbsCount} / ${upcomingBbsWeight.toLocaleString(undefined, {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })} t`}
                </dd>
              </div>
            </dl>
          </Card>
        </section>

        <section className="grid gap-6">
          <Card
            title="Daily tasks checklist"
            subtitle={
              publicDailyTasksDateLabel
                ? `Snapshot for ${publicDailyTasksDateLabel}`
                : "Latest published updates from the field team"
            }
            actions={
              <button
                type="button"
                onClick={refreshPublicDailyTasks}
                disabled={publicDailyTasksLoading}
                className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-neutral-300/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700 dark:border-neutral-700/70 dark:bg-neutral-900/60 dark:text-neutral-200 dark:focus-visible:outline-neutral-300"
              >
                Refresh
              </button>
            }
          >
            <div className="sr-only" id="daily-tasks-summary">
              {publicDailyTasksSummary}
            </div>
            {publicDailyTasksLoading && (
              <p className="text-sm text-neutral-600 dark:text-neutral-300">Loading daily tasks…</p>
            )}
            {!publicDailyTasksLoading && publicDailyTasksError && (
              <p className="text-sm text-red-600 dark:text-red-300" role="alert">
                Unable to load daily tasks. {publicDailyTasksError}
              </p>
            )}
            {!publicDailyTasksLoading && !publicDailyTasksError && !hasPublicDailyTasks && (
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                No daily tasks have been published yet. Check back soon.
              </p>
            )}
            {!publicDailyTasksLoading && !publicDailyTasksError && hasPublicDailyTasks && (
              <div className="overflow-x-auto">
                <table
                  className="min-w-full divide-y divide-neutral-200 text-sm dark:divide-neutral-800/80"
                  aria-describedby="daily-tasks-summary"
                >
                  <thead className="bg-neutral-50/80 text-left text-xs font-semibold uppercase tracking-[0.15em] text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-300">
                    <tr>
                      <th scope="col" className="px-4 py-3">
                        Task
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Status
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Last update
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Remarks
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800/80">
                    {publicDailyTasks.map((task) => {
                      const statusLabel = task.status
                        ? task.status.charAt(0).toUpperCase() + task.status.slice(1)
                        : "Unknown";
                      const badgeClasses =
                        DAILY_TASK_STATUS_STYLES[task.status] ||
                        "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200";
                      const updatedAtLabel = formatDateTimeLabel(task.updated_at);
                      const profile = task.updated_by_profile || {};
                      const updatedByName =
                        profile.full_name?.trim() ||
                        profile.email ||
                        (task.updated_by ? "Team member" : "");
                      const remarks = task.remarks?.trim();
                      return (
                        <tr key={task.id} className="align-top">
                          <td className="px-4 py-3 text-neutral-900 dark:text-neutral-50">
                            <span className="font-semibold">{task.title}</span>
                            {task.task_date && (
                              <span className="mt-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
                                {formatDateLabel(task.task_date)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${badgeClasses}`}
                            >
                              {statusLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-neutral-600 dark:text-neutral-300">
                            {updatedAtLabel || "Not updated yet"}
                            {updatedByName && (
                              <span className="block text-xs text-neutral-500 dark:text-neutral-400">by {updatedByName}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                            {remarks ? (
                              remarks
                            ) : (
                              <span className="text-neutral-400 dark:text-neutral-500">No remarks provided.</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </section>

        <section id="reports" className="grid gap-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Live performance overview</h2>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              These interactive charts aggregate the latest data captured by the site team.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card title="Concrete volume" subtitle="Daily pour totals">
              <div className="sr-only" id="concrete-summary">
                {concreteSummary}
              </div>
              <ResponsiveContainer
                width="100%"
                height={260}
                role="img"
                aria-label="Bar chart showing concrete volume by date"
                aria-describedby="concrete-summary"
              >
                <BarChart data={concreteData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip cursor={{ fill: "transparent" }} />
                  <Bar dataKey="volume" fill="#111827" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card title="BBS deliveries" subtitle="Tonnage scheduled by date">
              <div className="sr-only" id="bbs-summary">
                {bbsDeliverySummary}
              </div>
              <ResponsiveContainer
                width="100%"
                height={260}
                role="img"
                aria-label="Bar chart showing BBS delivery tonnage by date"
                aria-describedby="bbs-summary"
              >
                <BarChart data={bbsDeliveryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip cursor={{ fill: "transparent" }} />
                  <Bar dataKey="weight" fill="#0f172a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card title="Manpower" subtitle="Headcount trend">
              <div className="sr-only" id="manpower-summary">
                {manpowerSummary}
              </div>
              <ResponsiveContainer
                width="100%"
                height={260}
                role="img"
                aria-label="Line chart showing manpower counts over time"
                aria-describedby="manpower-summary"
              >
                <LineChart data={manpowerData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip cursor={false} />
                  <Line type="monotone" dataKey="workers" stroke="#2563eb" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
            <Card title="Materials by status" subtitle="Requests and deliveries">
              <div className="sr-only" id="materials-summary">
                {materialSummary}
              </div>
              <ResponsiveContainer
                width="100%"
                height={260}
                role="img"
                aria-label="Pie chart showing material requests grouped by status"
                aria-describedby="materials-summary"
              >
                <PieChart>
                  <Tooltip />
                  <Pie data={materialsByStatus} dataKey="value" nameKey="name" outerRadius={100}>
                    {materialsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </section>

        <section className="grid gap-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Latest log entries</h2>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              Up to eight of the most recent submissions are displayed for each dataset. Sign in to manage or export the complete history.
            </p>
          </div>
          <div className="grid gap-6">
            <Card
              title="Concrete pours"
              subtitle="Most recent records"
              actions={
                <span className="ml-auto text-xs text-neutral-600 dark:text-neutral-300">
                  Showing latest 8 of {concreteRows.length}
                </span>
              }
            >
              <DataTable
                caption="Recent concrete pour submissions"
                columns={["date", "pour_id", "location", "element", "volume", "mix", "supplier"]}
                rows={concreteRows}
                maxRows={8}
                loading={concreteLoading}
                error={concreteError}
              />
            </Card>
            <Card
              title="Manpower logs"
              subtitle="Crew allocation snapshot"
              actions={
                <span className="ml-auto text-xs text-neutral-600 dark:text-neutral-300">
                  Showing latest 8 of {manpowerRows.length}
                </span>
              }
            >
              <DataTable
                caption="Recent manpower log entries"
                columns={["date", "contractor", "trade", "workers", "shift", "level", "zone", "supervisor"]}
                rows={manpowerRows}
                maxRows={8}
                loading={manpowerLoading}
                error={manpowerError}
              />
            </Card>
            <Card
              title="Site issues"
              subtitle="Outstanding and closed items"
              actions={
                <span className="ml-auto text-xs text-neutral-600 dark:text-neutral-300">
                  Showing latest 8 of {issuesRows.length}
                </span>
              }
            >
              <DataTable
                caption="Recent issue reports"
                columns={["date", "location", "description", "severity", "status", "owner"]}
                rows={issuesRows}
                maxRows={8}
                loading={issuesLoading}
                error={issuesError}
              />
            </Card>
            <Card
              title="Material movements"
              subtitle="Requests and deliveries"
              actions={
                <span className="ml-auto text-xs text-neutral-600 dark:text-neutral-300">
                  Showing latest 8 of {materialRows.length}
                </span>
              }
            >
              <DataTable
                caption="Recent material movement records"
                columns={["date", "type", "item", "qty", "unit", "status", "location"]}
                rows={materialRows}
                maxRows={8}
                loading={materialLoading}
                error={materialError}
              />
            </Card>
            <Card
              title="BBS delivery schedule"
              subtitle="Upcoming reinforcement drops"
              actions={
                <span className="ml-auto text-xs text-neutral-600 dark:text-neutral-300">
                  Showing latest 8 of {bbsRows.length}
                </span>
              }
            >
              <DataTable
                caption="Planned BBS deliveries"
                columns={[
                  "delivery_date",
                  "element",
                  "bar_mark",
                  "diameter_mm",
                  "length_m",
                  "weight_tons",
                  "supplier",
                  "status",
                  "remarks",
                ]}
                rows={bbsRows}
                maxRows={8}
                loading={bbsLoading}
                error={bbsError}
              />
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/70 bg-white/85 py-6 text-sm text-neutral-600 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/85 dark:text-neutral-300">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6">
          <span>© {new Date().getFullYear()} FieldSight Reporting</span>
          <Link
            to="/app"
            className="underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700 dark:focus-visible:outline-neutral-200"
          >
            Admin sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}

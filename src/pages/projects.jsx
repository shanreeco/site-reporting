import React, { useMemo, useState } from "react";
import CardProject from "../components/CardProject";
import Header from "../components/Header";
import { useProjects } from "../hooks/useProjects";

function normalizeStatus(status) {
  return (status || "").toString().trim().toLowerCase();
}

function getDateValue(project, ...keys) {
  for (const key of keys) {
    const value = project?.[key];
    if (!value) continue;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function getLocation(project) {
  return (
    project?.location ||
    project?.city ||
    project?.region ||
    project?.site ||
    project?.address ||
    ""
  ).trim();
}

function getProgress(project) {
  const candidates = [
    project?.progress,
    project?.completion,
    project?.completionPercentage,
    project?.completion_percentage,
    project?.percent_complete,
  ];
  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.min(100, Math.max(0, value));
    }
  }
  if (normalizeStatus(project?.status) === "completed") return 100;
  return 0;
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const statusColors = {
  pending: "bg-amber-400",
  "in-progress": "bg-blue-500",
  completed: "bg-emerald-500",
  delayed: "bg-rose-500",
  default: "bg-slate-400",
};

export default function ProjectsPage() {
  const { projects, loading, error, notice, refresh } = useProjects();
  const [statusFilter, setStatusFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [sortOption, setSortOption] = useState("recent");

  const locationOptions = useMemo(() => {
    const unique = new Set();
    projects.forEach((project) => {
      const location = getLocation(project);
      if (location) unique.add(location);
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const status = normalizeStatus(project.status);
      if (statusFilter !== "all" && status !== statusFilter) {
        return false;
      }
      if (locationFilter !== "all") {
        return getLocation(project).toLowerCase() === locationFilter.toLowerCase();
      }
      return true;
    });
  }, [projects, statusFilter, locationFilter]);

  const sortedProjects = useMemo(() => {
    const sorted = [...filteredProjects];
    switch (sortOption) {
      case "progress":
        sorted.sort((a, b) => getProgress(b) - getProgress(a));
        break;
      case "deadline": {
        sorted.sort((a, b) => {
          const endA = getDateValue(a, "end_date", "endDate", "dueDate", "completion_date");
          const endB = getDateValue(b, "end_date", "endDate", "dueDate", "completion_date");
          if (!endA && !endB) return 0;
          if (!endA) return 1;
          if (!endB) return -1;
          return endA.getTime() - endB.getTime();
        });
        break;
      }
      case "name":
        sorted.sort((a, b) => (a?.name || "").localeCompare(b?.name || ""));
        break;
      case "recent":
      default:
        sorted.sort((a, b) => {
          const startA = getDateValue(a, "created_at", "start_date", "startDate", "start");
          const startB = getDateValue(b, "created_at", "start_date", "startDate", "start");
          if (!startA && !startB) return 0;
          if (!startA) return 1;
          if (!startB) return -1;
          return startB.getTime() - startA.getTime();
        });
        break;
    }
    return sorted;
  }, [filteredProjects, sortOption]);

  const upcomingDeadlines = useMemo(() => {
    const now = new Date();
    return filteredProjects
      .map((project) => ({ project, end: getDateValue(project, "end_date", "endDate", "dueDate") }))
      .filter(({ end }) => end && end.getTime() >= now.getTime())
      .sort((a, b) => a.end.getTime() - b.end.getTime())
      .slice(0, 4)
      .map(({ project, end }) => ({ project, end }));
  }, [filteredProjects]);

  const breakdown = useMemo(() => {
    const counts = new Map();
    projects.forEach((project) => {
      const status = normalizeStatus(project.status) || "unspecified";
      counts.set(status, (counts.get(status) || 0) + 1);
    });
    const total = projects.length || 1;
    return { counts, total };
  }, [projects]);

  const metrics = useMemo(() => {
    let active = 0;
    let completed = 0;
    let pending = 0;
    let atRisk = 0;
    let budget = 0;
    let upcoming = 0;
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setDate(now.getDate() + 30);

    projects.forEach((project) => {
      const status = normalizeStatus(project.status);
      if (status === "in-progress" || status === "active") active += 1;
      if (status === "completed" || status === "done") completed += 1;
      if (status === "pending") pending += 1;
      if (status === "delayed" || status === "at-risk") atRisk += 1;
      const numericBudget = Number(project?.budget);
      if (!Number.isNaN(numericBudget)) budget += numericBudget;
      const endDate = getDateValue(project, "end_date", "endDate", "dueDate");
      if (endDate && endDate >= now && endDate <= nextMonth) {
        upcoming += 1;
      }
    });

    return { active, completed, pending, atRisk, budget, upcoming };
  }, [projects]);

  const totalProjects = sortedProjects.length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header
        actions={
          <button
            type="button"
            onClick={refresh}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            Refresh data
          </button>
        }
      />

      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-8 lg:flex-row">
            <div className="flex-1 space-y-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
                  Project portfolio
                </p>
                <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">
                  Deep dive into active and upcoming builds
                </h1>
              </div>
              <p className="text-sm text-slate-600">
                Analyze performance, upcoming milestones, and risk signals across the project life
                cycle. Sort by start date, upcoming deadlines, or completion to plan workloads and
                stakeholder updates.
              </p>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Active projects</p>
                  <p className="mt-2 text-2xl font-semibold">{metrics.active}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Pending kickoff</p>
                  <p className="mt-2 text-2xl font-semibold">{metrics.pending}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">At risk</p>
                  <p className="mt-2 text-2xl font-semibold">{metrics.atRisk}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Upcoming (30 days)</p>
                  <p className="mt-2 text-2xl font-semibold">{metrics.upcoming}</p>
                </div>
              </div>
            </div>

            <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
              <h2 className="text-sm font-semibold text-slate-600">Status distribution</h2>
              <div className="mt-4 space-y-3">
                {Array.from(breakdown.counts.entries()).map(([status, count]) => {
                  const color = statusColors[status] || statusColors.default;
                  const percentage = Math.round((count / breakdown.total) * 100);
                  return (
                    <div key={status} className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-3">
                        <span className={`h-2.5 w-2.5 rounded-full ${color}`} aria-hidden="true" />
                        <span className="capitalize text-slate-600">{status.replace(/-/g, " ")}</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-500">
                        <div className="h-2 w-28 overflow-hidden rounded-full bg-white/70">
                          <div className={`h-full ${color}`} style={{ width: `${percentage}%` }} />
                        </div>
                        <span className="text-xs font-medium text-slate-600">{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <dl className="mt-6 space-y-2 text-xs text-slate-500">
                <div className="flex justify-between">
                  <dt>Total portfolio budget</dt>
                  <dd className="font-medium text-slate-700">
                    {metrics.budget > 0 ? currencyFormatter.format(metrics.budget) : "TBD"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Completed projects</dt>
                  <dd className="font-medium text-slate-700">{metrics.completed}</dd>
                </div>
              </dl>
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
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</span>
              <select
                value={locationFilter}
                onChange={(event) => setLocationFilter(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="all">All locations</option>
                {locationOptions.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sort by</span>
              <select
                value={sortOption}
                onChange={(event) => setSortOption(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="recent">Most recent</option>
                <option value="deadline">Nearest deadline</option>
                <option value="progress">Highest progress</option>
                <option value="name">Alphabetical</option>
              </select>
            </label>

            <button
              type="button"
              onClick={() => {
                setStatusFilter("all");
                setLocationFilter("all");
                setSortOption("recent");
              }}
              className="mt-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 md:mt-0"
            >
              Reset
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
            {loading ? (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-80 animate-pulse rounded-3xl border border-slate-200 bg-white"
                  />
                ))}
              </div>
            ) : totalProjects === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-10 py-16 text-center">
                <h2 className="text-xl font-semibold text-slate-900">No projects match your filters</h2>
                <p className="mt-2 max-w-md text-sm text-slate-600">
                  Try adjusting your filters or refreshing the latest data from Supabase to see every
                  project in your workspace.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {sortedProjects.map((project) => (
                  <CardProject key={project.id ?? project.name} project={project} />
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Upcoming deadlines</h2>
              <p className="text-sm text-slate-500">Focus on handoffs happening soon.</p>
              <div className="mt-5 space-y-4">
                {upcomingDeadlines.length === 0 ? (
                  <p className="text-sm text-slate-500">No upcoming deadlines within the next 90 days.</p>
                ) : (
                  upcomingDeadlines.map(({ project, end }) => (
                    <div key={project.id ?? project.name} className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4">
                      <p className="text-sm font-medium text-slate-900">{project?.name || "Untitled project"}</p>
                      <p className="text-xs text-slate-500">{getLocation(project) || "Location TBD"}</p>
                      <p className="mt-2 text-xs text-slate-600">
                        Due on {end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Team reminders</h2>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li>• Review procurement orders for upcoming mobilizations.</li>
                <li>• Align subcontractor schedules for overlapping scopes.</li>
                <li>• Update field photos and safety observations weekly.</li>
              </ul>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

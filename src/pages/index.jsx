import React, { useMemo, useState } from "react";
import CardProject from "../components/CardProject";
import Header from "../components/Header";
import { useProjects } from "../hooks/useProjects";

function normalizeStatus(status) {
  return (status || "").toString().trim().toLowerCase();
}

function getProgressValue(project) {
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
  return null;
}

export default function HomePage() {
  const { projects, loading, error, notice } = useProjects();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const metrics = useMemo(() => {
    const totals = {
      total: projects.length,
      inProgress: 0,
      completed: 0,
      pending: 0,
      averageProgress: 0,
    };
    let progressSum = 0;
    let progressCount = 0;

    projects.forEach((project) => {
      const status = normalizeStatus(project.status);
      if (status === "in-progress" || status === "active") totals.inProgress += 1;
      if (status === "completed" || status === "done") totals.completed += 1;
      if (status === "pending") totals.pending += 1;
      const progress = getProgressValue(project);
      if (typeof progress === "number") {
        progressSum += progress;
        progressCount += 1;
      }
    });

    totals.averageProgress = progressCount > 0 ? Math.round(progressSum / progressCount) : 0;
    return totals;
  }, [projects]);

  const visibleProjects = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return projects.filter((project) => {
      const status = normalizeStatus(project.status);
      if (statusFilter !== "all" && status !== statusFilter) {
        return false;
      }
      if (!term) return true;
      const haystack = [project?.name, project?.location, project?.city, project?.manager]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [projects, searchTerm, statusFilter]);

  const showEmptyState = !loading && visibleProjects.length === 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
        <section className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl space-y-3">
              <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
                Portfolio overview
              </p>
              <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">
                Monitor every construction project with clarity and confidence
              </h1>
              <p className="text-base text-slate-600">
                Search, filter, and track progress across your organization. Real-time data and
                thoughtful design help teams spot risks before they become delays.
              </p>
            </div>
            <div className="grid w-full max-w-sm grid-cols-2 gap-3 text-center sm:max-w-none sm:grid-cols-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Total projects</p>
                <p className="mt-2 text-2xl font-semibold">{metrics.total}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">In progress</p>
                <p className="mt-2 text-2xl font-semibold">{metrics.inProgress}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Completed</p>
                <p className="mt-2 text-2xl font-semibold">{metrics.completed}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Avg. progress</p>
                <p className="mt-2 text-2xl font-semibold">{metrics.averageProgress}%</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <label className="flex-1 text-sm">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Search
              </span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by project, manager, or location"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>

            <label className="w-full text-sm md:w-52">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
            </label>

            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
              }}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 md:w-auto"
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

        <section className="pb-10">
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-80 animate-pulse rounded-3xl border border-slate-200 bg-white"
                />
              ))}
            </div>
          ) : showEmptyState ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-10 py-16 text-center">
              <div className="mb-6 rounded-full bg-slate-100 p-4 text-blue-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-10 w-10"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-9A2.25 2.25 0 002.25 5.25v13.5A2.25 2.25 0 004.5 21h9a2.25 2.25 0 002.25-2.25V15m0-6l5.25-3v12l-5.25-3m0-6v6"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-slate-900">No projects found</h2>
              <p className="mt-2 max-w-md text-sm text-slate-600">
                Try adjusting your search filters or sync the latest data from Supabase to see your
                active portfolio.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {visibleProjects.map((project) => (
                <CardProject key={project.id ?? project.name} project={project} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

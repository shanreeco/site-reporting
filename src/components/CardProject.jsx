import React, { useEffect, useMemo, useState } from "react";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=80";

const numberFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function normalizeStatus(status) {
  return (status || "pending").toString().trim().toLowerCase();
}

function getStatusStyle(status) {
  switch (normalizeStatus(status)) {
    case "pending":
      return "text-amber-700 bg-amber-100";
    case "in-progress":
    case "active":
      return "text-blue-700 bg-blue-100";
    case "completed":
    case "done":
      return "text-emerald-700 bg-emerald-100";
    case "delayed":
    case "at-risk":
      return "text-red-700 bg-red-100";
    default:
      return "text-slate-700 bg-slate-100";
  }
}

function clampProgress(value) {
  if (Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function extractProgress(project) {
  const candidates = [
    project?.progress,
    project?.completion,
    project?.completionPercentage,
    project?.completion_percentage,
    project?.percent_complete,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return clampProgress(candidate);
    }
  }
  return normalizeStatus(project?.status) === "completed" ? 100 : 65;
}

function formatDate(dateLike) {
  if (!dateLike) return null;
  const parsed = new Date(dateLike);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatBudget(budget) {
  if (budget == null || Number.isNaN(Number(budget))) return null;
  try {
    return numberFormatter.format(Number(budget));
  } catch (error) {
    return `$${Number(budget).toLocaleString()}`;
  }
}

export default function CardProject({ project }) {
  const [progress, setProgress] = useState(0);
  const normalizedStatus = normalizeStatus(project?.status);

  const targetProgress = useMemo(() => extractProgress(project), [project]);

  useEffect(() => {
    let animationFrame;
    setProgress(0);

    if (targetProgress === 0) {
      setProgress(0);
      return undefined;
    }

    const duration = 800;
    const start = performance.now();

    const animate = (now) => {
      const elapsed = now - start;
      const nextValue = clampProgress(
        (elapsed / duration) * targetProgress + targetProgress * 0.1,
      );
      setProgress((prev) => {
        const eased = Math.min(targetProgress, Math.max(prev, nextValue));
        return eased;
      });
      if (elapsed < duration) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setProgress(targetProgress);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [targetProgress]);

  const location =
    project?.location ||
    project?.city ||
    project?.region ||
    project?.site ||
    "Location to be confirmed";
  const startDate =
    formatDate(project?.start_date || project?.startDate || project?.start) ||
    "Start date pending";
  const endDate = formatDate(project?.end_date || project?.endDate || project?.dueDate);
  const budget = formatBudget(project?.budget || project?.estimatedBudget);
  const image = project?.image || project?.image_url || FALLBACK_IMAGE;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition transform-gpu hover:-translate-y-1 hover:shadow-xl">
      <div className="relative h-48 w-full overflow-hidden bg-slate-200">
        <img
          src={image}
          alt={project?.name || "Project"}
          loading="lazy"
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />
        <span
          className={`absolute right-4 top-4 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium shadow-sm ${getStatusStyle(normalizedStatus)}`}
        >
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-current" aria-hidden="true" />
          {normalizedStatus.replace(/-/g, " ")}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-6">
        <header>
          <h3 className="text-lg font-semibold text-slate-900 transition group-hover:text-blue-700">
            {project?.name || "Untitled project"}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {location}
            <span className="mx-2 text-slate-400">•</span>
            {startDate}
            {endDate ? (
              <span className="text-slate-500"> → {endDate}</span>
            ) : null}
          </p>
        </header>

        {project?.description ? (
          <p className="text-sm text-slate-600" title={project.description}>
            {project.description}
          </p>
        ) : null}

        <div className="mt-auto space-y-3">
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span className="font-medium text-slate-900">Progress</span>
            <span>{progress}%</span>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-xs text-slate-600">
            <div className="rounded-xl border border-slate-200/70 px-3 py-2">
              <dt className="text-slate-500">Supervisor</dt>
              <dd className="font-medium text-slate-900">
                {project?.manager || project?.supervisor || "Not assigned"}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-200/70 px-3 py-2 text-right">
              <dt className="text-slate-500">Budget</dt>
              <dd className="font-medium text-slate-900">
                {budget || "TBD"}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </article>
  );
}

import { useId } from "react";

export default function Card({ title, subtitle, actions, className = "", children }) {
  const sectionId = useId();
  const headingId = title ? `${sectionId}-title` : undefined;
  const subtitleId = subtitle ? `${sectionId}-subtitle` : undefined;

  return (
    <section
      aria-labelledby={headingId}
      aria-describedby={subtitleId}
      className={
        "relative overflow-hidden rounded-3xl border border-white/80 bg-white/90 p-6 shadow-lg backdrop-blur " +
        "focus-within:ring-2 focus-within:ring-neutral-500/50 " +
        "dark:border-neutral-700/80 dark:bg-neutral-900/85 dark:shadow-[0_20px_45px_-25px_rgba(0,0,0,0.45)] dark:focus-within:ring-neutral-200/40 ring-1 ring-black/5" +
        (className ? ` ${className}` : "")
      }
    >
      <div className="flex flex-col gap-4">
        {(title || subtitle) && (
          <header className="flex flex-col gap-1">
            {title && (
              <h3 id={headingId} className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                {title}
              </h3>
            )}
            {subtitle && (
              <p id={subtitleId} className="text-sm text-neutral-600 dark:text-neutral-300">
                {subtitle}
              </p>
            )}
          </header>
        )}
        {actions && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">{actions}</div>
        )}
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

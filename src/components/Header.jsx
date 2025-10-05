import React from "react";

export default function Header({
  title,
  subtitle,
  tabs,
  activeTab,
  onTabChange,
  onEditProfile,
  onSignOut,
  avatarInitial = "",
}) {
  const baseTabStyles =
    "px-3 py-1.5 rounded-full border border-transparent text-sm font-medium transition";
  const activeTabStyles = "bg-neutral-900 text-white shadow-sm dark:bg-neutral-100 dark:text-neutral-900";
  const inactiveTabStyles =
    "bg-white/70 text-neutral-600 hover:bg-white dark:bg-neutral-800/80 dark:text-neutral-300 dark:hover:bg-neutral-700/80";

  return (
    <header className="sticky top-0 z-30 border-b border-white/70 bg-white/85 backdrop-blur-xl shadow-sm dark:border-neutral-800 dark:bg-neutral-900/85" role="banner">
      <div className="max-w-7xl mx-auto flex flex-col gap-4 px-6 py-5">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            {subtitle && <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">{subtitle}</p>}
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">{title}</h1>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              onClick={onEditProfile}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-sm font-semibold text-neutral-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:focus-visible:outline-neutral-300"
              aria-label={avatarInitial ? "Open profile" : undefined}
            >
              {avatarInitial || <span className="sr-only">Open profile</span>}
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white dark:bg-neutral-100 dark:text-neutral-900 dark:focus-visible:outline-neutral-300"
            >
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
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-7.5A2.25 2.25 0 003.75 5.25v13.5A2.25 2.25 0 006 21h7.5a2.25 2.25 0 002.25-2.25V15"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 12H9m0 0l3-3m-3 3l3 3" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
        {tabs?.length ? (
          <nav className="flex flex-wrap gap-2" aria-label="Workspace sections">
            {tabs.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => onTabChange?.(value)}
                className={`${baseTabStyles} ${value === activeTab ? activeTabStyles : inactiveTabStyles} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700 dark:focus-visible:outline-neutral-300`}
                aria-current={value === activeTab ? "page" : undefined}
              >
                {label}
              </button>
            ))}
          </nav>
        ) : null}
      </div>
    </header>
  );
}

import React from "react";

export default function Header({
  title,
  tabs,
  activeTab,
  onTabChange,
  onEditProfile,
  onSignOut,
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/80 text-white backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="hidden h-9 w-9 items-center justify-center rounded-full bg-indigo-500/80 text-sm font-semibold uppercase tracking-wider shadow-lg shadow-indigo-500/30 md:flex">
            SR
          </div>
          <div>
            <h1 className="text-2xl font-semibold leading-snug">{title}</h1>
            <p className="text-sm text-slate-300">Daily site intelligence at a glance</p>
          </div>
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
          <nav className="flex flex-wrap gap-2">
            {tabs?.map(({ value, label }) => {
              const isActive = value === activeTab;
              return (
                <button
                  key={value}
                  onClick={() => onTabChange?.(value)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "border-white bg-white text-slate-900 shadow-md shadow-white/30"
                      : "border-white/20 bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </nav>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onEditProfile}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white/80 transition hover:-translate-y-0.5 hover:bg-white/20 hover:text-white"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="h-4 w-4"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 20.25a7.75 7.75 0 0115.5 0" />
              </svg>
              <span className="hidden sm:inline">Profile</span>
              <span className="sm:hidden">Edit</span>
            </button>
            <button
              onClick={onSignOut}
              className="inline-flex items-center gap-2 rounded-full bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/40 transition hover:-translate-y-0.5 hover:bg-indigo-400"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

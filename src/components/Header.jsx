import React from "react";

export default function Header({
  title,
  tabs,
  activeTab,
  onTabChange,
  onEditProfile,
  onSignOut,
}) {
  const baseTabStyles =
    "px-3 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-700";
  const activeTabStyles = "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900";
  const inactiveTabStyles = "bg-white hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700";

  return (
    <header className="px-6 pt-6 border-b border-neutral-200 dark:border-neutral-700 bg-white/70 dark:bg-neutral-800/70 backdrop-blur">
      <div className="flex flex-wrap items-center gap-3 max-w-7xl mx-auto">
        <h1 className="text-xl font-semibold">{title}</h1>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onEditProfile}
            className="p-2 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="w-5 h-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 20.25a7.75 7.75 0 0115.5 0" />
            </svg>
            <span className="sr-only">Edit profile</span>
          </button>
          <button
            onClick={onSignOut}
            className="px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded"
          >
            Sign out
          </button>
        </div>
      </div>
      <div className="max-w-7xl mx-auto">
        <nav className="mt-4 flex gap-2 flex-wrap">
          {tabs?.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onTabChange?.(value)}
              className={`${baseTabStyles} ${value === activeTab ? activeTabStyles : inactiveTabStyles}`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}

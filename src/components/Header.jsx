import React from "react";
import { Link, NavLink } from "react-router-dom";

const navigation = [
  { to: "/", label: "Overview" },
  { to: "/projects", label: "Projects" },
  { to: "/reports", label: "Reports" },
];

const baseLinkStyles =
  "rounded-full px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring focus-visible:ring-blue-500/60";

export default function Header({ actions = null }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-4">
        <Link to="/" className="flex items-center gap-3 text-left">
          <img src="/logo.png" alt="Site Reporting" className="h-10 w-10 rounded-xl border border-slate-200" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Site Reporting</p>
            <p className="text-base font-semibold text-slate-900">Construction Intelligence Hub</p>
          </div>
        </Link>

        <nav className="flex flex-1 flex-wrap items-center justify-end gap-2 text-sm">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `${baseLinkStyles} ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        {actions ? <div className="ml-auto flex items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

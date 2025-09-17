import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import HomePage from "./pages/index";
import ProjectsPage from "./pages/projects";
import ReportsPage from "./pages/reports";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/reports" element={<ReportsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

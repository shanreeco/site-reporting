import { Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/home";
import ReportsPage from "./pages/reports";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/app" element={<ReportsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

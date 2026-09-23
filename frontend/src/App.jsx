import { Routes, Route } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import Dashboard from "./pages/Dashboard";
import Questions from "./pages/Questions";
import Assessments from "./pages/Assessments";
import Results from "./pages/Results";
import Login from "./pages/Login";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <AppShell>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/questions" element={<Questions />} />
              <Route path="/evaluations" element={<Assessments />} />
              <Route path="/resultats" element={<Results />} />
            </Routes>
          </AppShell>
        }
      />
    </Routes>
  );
}

import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import { RequireAuth } from "./auth/AuthContext";
import { homePath, useAuth } from "./auth/useAuth";
import Dashboard from "./pages/Dashboard";
import Questions from "./pages/Questions";
import Assessments from "./pages/Assessments";
import Results from "./pages/Results";
import Login from "./pages/Login";

const STAFF = ["ENSEIGNANT", "ADMINISTRATEUR"];

function Home() {
  const { user } = useAuth();
  return user.role === "ENSEIGNANT" ? <Dashboard /> : <Navigate to={homePath(user.role)} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <AppShell>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/questions" element={<RequireAuth roles={STAFF}><Questions /></RequireAuth>} />
                <Route path="/evaluations" element={<RequireAuth roles={STAFF}><Assessments /></RequireAuth>} />
                <Route path="/resultats" element={<RequireAuth roles={STAFF}><Results /></RequireAuth>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppShell>
          </RequireAuth>
        }
      />
    </Routes>
  );
}

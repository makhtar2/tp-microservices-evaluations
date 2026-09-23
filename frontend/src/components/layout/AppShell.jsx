import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import "./AppShell.css";

export default function AppShell({ children }) {
  return (
    <div className="app-page">
      <div className="app-shell">
        <Topbar />
        <div className="app-body">
          <Sidebar />
          <main className="app-content">{children}</main>
        </div>
      </div>
    </div>
  );
}

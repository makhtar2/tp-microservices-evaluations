import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppShell({ children }) {
  return (
    <div className="min-h-screen flex p-3 sm:p-6">
      <div className="app-shell">
        <Topbar />
        <div className="flex-1 flex gap-5 min-h-0">
          <Sidebar />
          <main className="flex-1 min-w-0 flex flex-col gap-5">{children}</main>
        </div>
      </div>
    </div>
  );
}

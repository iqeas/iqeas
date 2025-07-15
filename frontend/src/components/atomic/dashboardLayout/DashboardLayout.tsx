import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Folder,
  BookOpen,
  Layers,
  ListChecks,
  FileText,
  Settings,
  Calendar,
  File,
  Home,
  RefreshCcw,
  Send,
  MessageCircle,
  FileCheck2,
  Activity,
  LogOut,
  Users,
} from "lucide-react";

const menuConfig = {
  pm: [
    { label: "Projects", to: "/pm", icon: Home },
    { label: "Document Center", to: "/pm/documents", icon: BookOpen },
    { label: "Calendar", to: "/pm/calendar", icon: Calendar },
  ],
  rfq: [
    { label: "Dashboard", to: "/rfq", icon: Home },
    { label: "Document Center", to: "/rfq/documents", icon: BookOpen },
    { label: "Calendar", to: "/rfq/calendar", icon: Calendar },
  ],
  estimation: [
    { label: "Estimation Tracker", to: "/estimation", icon: Home },
    { label: "Document Center", to: "/estimation/documents", icon: BookOpen },
    { label: "Calendar", to: "/estimation/calendar", icon: Calendar },
  ],
  documentation: [
    { label: "Document submission", to: "/documentation", icon: Home },
    {
      label: "Document Center",
      to: "/documentation/documents",
      icon: BookOpen,
    },
    { label: "Calendar", to: "/documentation/calendar", icon: Calendar },
  ],
  working: [
    { label: "My Task", to: "/working", icon: Home },
    { label: "Document Center", to: "/working/documents", icon: BookOpen },
    { label: "Calendar", to: "/working/calendar", icon: Calendar },
  ],
  admin: [
    { label: "Projects", to: "/admin", icon: Folder },
    { label: "Members", to: "/admin/members", icon: Calendar },
    { label: "Document Center", to: "/admin/documents", icon: Calendar },
    { label: "Calendar", to: "/admin/calendar", icon: Calendar },
  ],
};

const roleLabels: Record<string, string> = {
  pm: "Project Manager",
  rfq: "RFQ Team",
  estimation: "Estimation Department",
  documentation: "Documentation Team",
  working: "Working Team",
  admin: "Admin",
};

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();
  const role = user?.role?.toLowerCase() || "";
  const links = menuConfig[role] || [];
  const roleLabel = roleLabels[role] || role;
  const { pathname } = useLocation();

  return (
    <div className="flex">
      <aside className="w-64 bg-white border-r border-slate-200 h-screen fixed top-2  flex flex-col justify-between overflow-y-auto">
        <div>
          <div className="p-4 pb-2 border-b border-slate-100">
            <h2 className="text-lg font-bold text-blue-700 mb-1">
              {roleLabel}
            </h2>
          </div>
          <nav className="flex flex-col space-y-1 p-4">
            {links.map(({ label, to, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center px-4 py-2 rounded-lg font-medium transition ${
                    to === pathname
                      ? "bg-blue-50 text-blue-700 border-r-2 border-blue-600"
                      : "text-slate-700 hover:bg-slate-50"
                  }`
                }
              >
                {Icon && <Icon size={18} className="mr-3" />}
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="p-4">
          <button
            onClick={logout}
            className="flex items-center w-full px-4 py-2 rounded-lg font-medium transition text-red-600 hover:bg-red-50"
            style={{ border: 0, background: "none" }}
          >
            <LogOut size={18} className="mr-3 text-red-600" />
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 ml-64">{children}</main>
    </div>
  );
};

export default DashboardLayout;

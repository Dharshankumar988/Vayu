"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store";
import { useUIStore } from "@/store/uiStore";
import NotificationBar from "@/components/ui/NotificationBar";
import AdminControls from "./tabs/AdminControls";
import UserApproval from "./tabs/UserApproval";
import OperationalLogs from "./tabs/OperationalLogs";
import RegionalView from "./tabs/RegionalView";
import SimulationTab from "./tabs/SimulationTab";
import {
  Settings, Users, BarChart2, Globe, Zap, LogOut, Server, ChevronLeft, ChevronRight
} from "lucide-react";

const TABS = [
  { id: 0, label: "Admin Controls",   icon: Settings,  color: "#2563eb" },
  { id: 1, label: "User Approval",    icon: Users,     color: "#16a34a" },
  { id: 2, label: "Operational Logs", icon: BarChart2, color: "#7c3aed" },
  { id: 3, label: "Regional / DC",    icon: Globe,     color: "#0891b2" },
  { id: 4, label: "Simulation",       icon: Zap,       color: "#dc2626" },
];

export default function AdminDashboard() {
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const activeTab = useAppStore((s) => s.activeAdminTab);
  const setActiveTab = useAppStore((s) => s.setActiveAdminTab);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const TAB_COMPONENTS = [AdminControls, UserApproval, OperationalLogs, RegionalView, SimulationTab];
  const ActiveComponent = TAB_COMPONENTS[activeTab];

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#f8fafc" }}>
      {/* Sidebar */}
      <motion.div
        animate={{ width: sidebarCollapsed ? 64 : 240 }}
        className="sidebar flex-shrink-0 flex flex-col relative z-10"
        style={{ background: "white", borderRight: "1px solid #e2e8f0", transition: "width 0.2s" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/30">
            <Server className="w-5 h-5 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div>
              <p className="font-bold text-slate-900 text-sm">VAYU</p>
              <p className="text-[10px] text-slate-400">Admin Console</p>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3 overflow-hidden">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`admin-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-3 py-3 mx-1 rounded-xl text-left transition-all mb-0.5 ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                }`}
                style={{ maxWidth: sidebarCollapsed ? 48 : "calc(100% - 8px)" }}
                title={sidebarCollapsed ? tab.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" style={{ color: isActive ? tab.color : undefined }} />
                {!sidebarCollapsed && (
                  <span className="text-sm font-medium truncate">{tab.label}</span>
                )}
                {!sidebarCollapsed && isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />
                )}
              </button>
            );
          })}
        </nav>

        {/* User info */}
        {!sidebarCollapsed && (
          <div className="p-4 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-sm font-bold text-blue-700">{user?.full_name?.[0] ?? "A"}</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">{user?.full_name}</p>
                <p className="text-[10px] text-slate-400">Administrator</p>
              </div>
            </div>
            <button
              onClick={() => setUser(null)}
              className="w-full flex items-center gap-2 text-xs text-slate-400 hover:text-red-500 transition-colors py-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 z-20"
        >
          {sidebarCollapsed
            ? <ChevronRight className="w-3 h-3 text-slate-500" />
            : <ChevronLeft className="w-3 h-3 text-slate-500" />}
        </button>
      </motion.div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 flex-shrink-0">
          <div>
            <h1 className="text-base font-bold text-slate-900">{TABS[activeTab].label}</h1>
            <p className="text-xs text-slate-400">Vayu Cloud Infrastructure Management System</p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBar />
            {sidebarCollapsed && (
              <button
                onClick={() => setUser(null)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <ActiveComponent />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

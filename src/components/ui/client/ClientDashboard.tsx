"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store";
import NotificationBar from "@/components/ui/NotificationBar";
import HostServers from "./tabs/HostServers";
import Reports from "./tabs/Reports";
import Logs from "./tabs/Logs";
import { Monitor, BarChart2, FileText, Server, LogOut } from "lucide-react";

const CLIENT_TABS = [
  { id: 0, label: "Host / Add Servers", icon: Monitor, color: "#2563eb" },
  { id: 1, label: "Reports",            icon: BarChart2, color: "#16a34a" },
  { id: 2, label: "Logs",               icon: FileText, color: "#7c3aed" },
];

export default function ClientDashboard() {
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const activeTab = useAppStore((s) => s.activeClientTab);
  const setActiveTab = useAppStore((s) => s.setActiveClientTab);

  const TAB_COMPONENTS = [HostServers, Reports, Logs];
  const ActiveComponent = TAB_COMPONENTS[activeTab];

  const isOrg = user?.client_type === "organization";

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#f8fafc" }}>
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/30">
            <Server className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm">VAYU</p>
            <p className="text-[10px] text-slate-400">
              {isOrg ? `${user?.company_name ?? "Organization"} Portal` : "Client Portal"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <NotificationBar />
          <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-800">{user?.full_name}</p>
              <p className="text-xs text-slate-400">
                {isOrg ? user?.company_name : user?.preferred_dc_region?.replace("_", " ") ?? "Client"}
              </p>
            </div>
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700">
              {user?.full_name?.[0] ?? "C"}
            </div>
            <button onClick={() => setUser(null)} className="text-slate-400 hover:text-red-500 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="tab-bar flex-shrink-0">
        {CLIENT_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} id={`client-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id as any)}
              className={`tab-item ${activeTab === tab.id ? "active" : ""}`}
            >
              <Icon className="w-4 h-4" style={activeTab === tab.id ? { color: tab.color } : undefined} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
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

      {/* Footer */}
      <div className="py-1.5 text-center bg-white border-t border-slate-200 flex-shrink-0">
        <p className="text-[10px] text-slate-400">© Designed by Dharshan Kumar B</p>
      </div>
    </div>
  );
}

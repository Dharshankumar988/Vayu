"use client";

import { useEffect, useRef, useMemo } from "react";
import { useAppStore } from "@/store";
import { useSimulationStore } from "@/store/simulationStore";
import { useUIStore } from "@/store/uiStore";
import { startAILoop, stopAILoop } from "@/lib/aiEngine";
import dynamic from "next/dynamic";

// Auth
import LoginPanel from "@/components/ui/LoginPanel";

// Dashboards (lazy loaded)
const AdminDashboard  = dynamic(() => import("@/components/ui/admin/AdminDashboard"),  { ssr: false });
const ClientDashboard = dynamic(() => import("@/components/ui/client/ClientDashboard"), { ssr: false });
const DataCenterInterior = dynamic(() => import("@/components/3d/Layer3/DataCenterInterior"), { ssr: false });

// Wrap globe in a screen with DC metrics overlay
const GlobeWithMetrics = dynamic(
  () => import("@/components/ui/GlobeScreen"),
  { ssr: false }
);

export default function Home() {
  const user      = useAppStore((s) => s.user);
  const viewMode  = useAppStore((s) => s.viewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);

  const updateSimulation = useSimulationStore((s) => s.updateSimulation);
  const addNotification  = useUIStore((s) => s.addNotification);

  // Track refs for intervals
  const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Session-scoped effects: start AI loop + simulation tick when user logs in
  useEffect(() => {
    if (!user) {
      stopAILoop();
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
      return;
    }

    // Start simulation engine (local state only, no API calls)
    simIntervalRef.current = setInterval(() => {
      updateSimulation(2);
    }, 2000);

    // Start AI loop (calls Groq API only on threshold events)
    startAILoop();

    addNotification({
      type: "success",
      title: `Welcome, ${user.full_name}`,
      message:
        user.role === "admin"
          ? "AI monitoring loop active. All 10 data centers online."
          : `Client portal ready. Hosting region: ${
              user.preferred_dc_region?.replace("_", " ") ?? "Global"
            }.`,
    });

    return () => {
      stopAILoop();
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
    };
  }, [user]);

  // Route to the correct view
  if (!user || viewMode === "auth") {
    return <LoginPanel />;
  }

  // DC Interior view (shared for admin drill-down + client host-servers)
  if (viewMode === "dc-interior") {
    return (
      <div className="relative w-screen h-screen overflow-hidden globe-zone">
        <DataCenterInterior />
        <button
          onClick={() =>
            setViewMode(
              user.role === "admin" ? "admin-dashboard" : "client-dashboard"
            )
          }
          className="absolute top-4 left-4 z-30 flex items-center gap-2 px-4 py-2 glass-panel-neon text-sm text-white font-medium rounded-xl hover:bg-white/10 transition-colors"
        >
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  if (user.role === "admin") {
    return <AdminDashboard />;
  }

  return <ClientDashboard />;
}

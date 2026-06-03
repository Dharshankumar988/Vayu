"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/store";
import { useDCStore } from "@/store/dcStore";
import { useSimulationStore } from "@/store/simulationStore";
import { BarChart2, Server, Shield, DollarSign, Loader2, Cpu, MemoryStick } from "lucide-react";

export default function Reports() {
  const user = useAppStore((s) => s.user);
  const dataCenters = useDCStore((s) => s.dataCenters);
  const simulationEvents = useSimulationStore((s) => s.simulationEvents);
  const [healthSummary, setHealthSummary] = useState<any>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  // Find all slots owned by this client
  const mySlots = dataCenters.flatMap((dc) =>
    dc.rooms.flatMap((room) =>
      room.racks.flatMap((rack) =>
        rack.slots.filter((slot) => slot.client_id === user?.id).map((slot) => ({
          ...slot,
          dcName: dc.name,
          rackName: rack.name,
        }))
      )
    )
  );

  const healthyCnt = mySlots.filter((s) => s.health === "healthy").length;
  const unhealthyCnt = mySlots.filter((s) => s.health === "unhealthy").length;
  const criticalCnt = mySlots.filter((s) => s.health === "critical").length;

  const affectedSims = simulationEvents.filter((e) => {
    const dc = dataCenters.find((d) => d.id === e.target_dc_id);
    return dc && mySlots.some((s) => s.rack_id.includes(dc.id.substring(0, 6)));
  });

  const monthlyBill = mySlots.length * 120;

  const fetchAIHealth = async () => {
    setLoadingAI(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemType: "Health Analysis",
          context: { serversOwned: mySlots.length, healthyCount: healthyCnt, criticalCount: criticalCnt },
          prompt: `Analyze the health of ${mySlots.length} servers: ${healthyCnt} healthy, ${unhealthyCnt} unhealthy, ${criticalCnt} critical. Provide a brief health summary.`,
        }),
      });
      const data = await res.json();
      setHealthSummary(data);
    } catch {} finally { setLoadingAI(false); }
  };

  useEffect(() => { if (mySlots.length > 0 && !healthSummary) fetchAIHealth(); }, [mySlots.length]);

  return (
    <div className="p-6 max-w-4xl">
      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Hosted Servers", value: mySlots.length, icon: Server, color: "#2563eb", bg: "#dbeafe" },
          { label: "Monthly Bill", value: `$${monthlyBill}`, icon: DollarSign, color: "#16a34a", bg: "#dcfce7" },
          { label: "Healthy", value: healthyCnt, icon: BarChart2, color: "#16a34a", bg: "#dcfce7" },
          { label: "Critical", value: criticalCnt, icon: Shield, color: criticalCnt > 0 ? "#dc2626" : "#16a34a", bg: criticalCnt > 0 ? "#fee2e2" : "#dcfce7" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="stat-card">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <span className="text-xs font-medium text-slate-500">{label}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Server health */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Server Health</h3>
          </div>
          {mySlots.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">No servers hosted yet.</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {mySlots.map((slot) => (
                <div key={slot.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{slot.server_name ?? "Server"}</p>
                    <p className="text-xs text-slate-400">{slot.dcName} · {slot.rackName} · Slot {slot.position}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Cpu className="w-3 h-3" />{(slot.cpu_util * 100).toFixed(0)}%</span>
                    </div>
                    <span className={`badge ${ slot.health === "healthy" ? "badge-healthy" : slot.health === "unhealthy" ? "badge-warning" : "badge-critical" }`}>
                      {slot.health}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Health Summary */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">AI Health Analysis</h3>
            <button onClick={fetchAIHealth} disabled={loadingAI}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
              {loadingAI ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Refresh"}
            </button>
          </div>
          {loadingAI ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : healthSummary ? (
            <div className="space-y-3">
              <div className={`rounded-xl p-3 ${ healthSummary.status === "healthy" ? "bg-green-50 border border-green-200" : healthSummary.status === "warning" ? "bg-amber-50 border border-amber-200" : "bg-red-50 border border-red-200" }`}>
                <p className={`text-sm leading-relaxed ${ healthSummary.status === "healthy" ? "text-green-800" : healthSummary.status === "warning" ? "text-amber-800" : "text-red-800" }`}>
                  {healthSummary.decision ?? healthSummary.summary}
                </p>
              </div>
              {healthSummary.recommendations?.map((rec: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 font-bold text-[9px]">{i + 1}</span>
                  </div>
                  {rec}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-slate-400 text-sm">No health data available.</div>
          )}

          {/* Anomaly reports */}
          {affectedSims.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="text-xs font-semibold text-slate-600 mb-2">⚠️ Active Anomalies</p>
              {affectedSims.map((sim) => (
                <div key={sim.id} className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-1">
                  {sim.type.replace("_", " ")} — {sim.severity} severity
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Zap, Shield, Activity, CheckCircle, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { useSimulationStore } from "@/store/simulationStore";
import { useDCStore } from "@/store/dcStore";
import { useAppStore } from "@/store";
import { useUIStore } from "@/store/uiStore";

const REGIONS = [
  { id: "north_america", name: "North America" },
  { id: "south_america", name: "South America" },
  { id: "europe", name: "Europe" },
  { id: "asia", name: "Asia" },
  { id: "africa", name: "Africa" },
  { id: "oceania", name: "Oceania" },
];

export default function SimulationTab() {
  const user = useAppStore((s) => s.user);
  const dataCenters = useDCStore((s) => s.dataCenters);
  const updateDCStatus = useDCStore((s) => s.updateDCStatus);
  const { triggerDDoS, triggerPhysicalDamage, triggerLoadIncrease, resolveSimulation, simulationEvents } = useSimulationStore();
  const addNotification = useUIStore((s) => s.addNotification);

  // Load increase state
  const [loadRegion, setLoadRegion] = useState("north_america");
  const [loadMult, setLoadMult] = useState(3);
  const [loadRunning, setLoadRunning] = useState(false);

  // DDoS state
  const [ddosDC, setDdosDC] = useState("");
  const [ddosSeverity, setDdosSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [ddosRunning, setDdosRunning] = useState(false);

  // Physical damage state
  const [damageDC, setDamageDC] = useState("");
  const [damageType, setDamageType] = useState("power");
  const [damageRunning, setDamageRunning] = useState(false);

  const activeSims = simulationEvents.filter((e) => e.active);

  const handleLoadIncrease = async () => {
    setLoadRunning(true);
    triggerLoadIncrease(loadRegion, loadMult);
    addNotification({
      type: "warning",
      title: `Load Surge — ${REGIONS.find((r) => r.id === loadRegion)?.name}`,
      message: `${loadMult}x traffic multiplier applied. AI monitoring response.`,
    });
    try {
      await fetch("/api/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trigger_load", region: loadRegion, multiplier: loadMult, started_by: user?.id }),
      });
    } catch {}
    setTimeout(() => setLoadRunning(false), 2000);
  };

  const handleDDoS = async () => {
    if (!ddosDC) return;
    setDdosRunning(true);
    const dc = dataCenters.find((d) => d.id === ddosDC)!;
    triggerDDoS(dc.id, dc.lat, dc.lng, ddosSeverity);
    updateDCStatus(dc.id, "critical", Math.min(1, dc.load + 0.3));
    addNotification({
      type: "critical",
      title: `DDoS Attack — ${dc.name}`,
      message: `${ddosSeverity.toUpperCase()} severity DDoS simulation active. Threat arcs visible on globe.`,
    });
    try {
      await fetch("/api/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trigger_ddos", dc_id: dc.id, severity: ddosSeverity, started_by: user?.id }),
      });
    } catch {}
    setTimeout(() => setDdosRunning(false), 2000);
  };

  const handleDamage = async () => {
    if (!damageDC) return;
    setDamageRunning(true);
    const dc = dataCenters.find((d) => d.id === damageDC)!;
    triggerPhysicalDamage(dc.id, dc.lat, dc.lng, damageType);
    updateDCStatus(dc.id, "offline", 0);
    addNotification({
      type: "critical",
      title: `Physical Damage — ${dc.name}`,
      message: `${damageType} failure simulated. Backup failover arcs activated.`,
    });
    try {
      await fetch("/api/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trigger_damage", dc_id: dc.id, damage_type: damageType, started_by: user?.id }),
      });
    } catch {}
    setTimeout(() => setDamageRunning(false), 2000);
  };

  const handleResolveAll = () => {
    activeSims.forEach((e) => resolveSimulation(e.id));
    // Restore DC statuses
    dataCenters.forEach((dc) => {
      if (dc.status === "critical" || dc.status === "offline") {
        updateDCStatus(dc.id, "healthy", Math.max(0.3, dc.load - 0.3));
      }
    });
    addNotification({ type: "success", title: "Simulations Resolved", message: "All active simulations have been stopped. Systems returning to normal." });
  };

  return (
    <div className="p-6 max-w-5xl">
      {/* Active simulations banner */}
      {activeSims.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <div>
              <p className="font-semibold text-red-900">{activeSims.length} Active Simulation{activeSims.length > 1 ? "s" : ""}</p>
              <p className="text-xs text-red-600">{activeSims.map((s) => s.type.replace("_", " ")).join(" · ")}</p>
            </div>
          </div>
          <button onClick={handleResolveAll} className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl text-sm font-medium transition-colors">
            <RefreshCw className="w-4 h-4" /> Resolve All
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Sim 1: Load Increase */}
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Activity className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Load Increase</h3>
              <p className="text-xs text-slate-400">Surge traffic in a region</p>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <div>
              <label className="section-header block">Target Region</label>
              <select className="select-light" value={loadRegion} onChange={(e) => setLoadRegion(e.target.value)}>
                {REGIONS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="section-header block">Multiplier: {loadMult}x</label>
              <input type="range" min="2" max="10" value={loadMult} onChange={(e) => setLoadMult(parseInt(e.target.value))} className="w-full" />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>2x (Moderate)</span><span>10x (Extreme)</span>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-700">
            <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
            Will increase region load and trigger AI traffic optimization.
          </div>

          <button id="sim-load-btn" onClick={handleLoadIncrease} disabled={loadRunning}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2">
            {loadRunning ? <><Loader2 className="w-4 h-4 animate-spin" />Launching...</> : <><Zap className="w-4 h-4" />Launch Simulation</>}
          </button>
        </div>

        {/* Sim 2: DDoS */}
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">DDoS Attack</h3>
              <p className="text-xs text-slate-400">Simulate cyber threat</p>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <div>
              <label className="section-header block">Target Data Center</label>
              <select className="select-light" value={ddosDC} onChange={(e) => setDdosDC(e.target.value)}>
                <option value="">Select DC</option>
                {dataCenters.map((dc) => <option key={dc.id} value={dc.id}>{dc.name}</option>)}
              </select>
            </div>
            <div>
              <label className="section-header block">Severity</label>
              <div className="grid grid-cols-4 gap-1">
                {(["low", "medium", "high", "critical"] as const).map((s) => (
                  <button key={s} onClick={() => setDdosSeverity(s)}
                    className={`py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                      ddosSeverity === s
                        ? s === "critical" ? "bg-red-600 text-white" : s === "high" ? "bg-orange-500 text-white" : s === "medium" ? "bg-amber-500 text-white" : "bg-yellow-400 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-xs text-red-700">
            <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
            Globe will show red threat arcs. AI threat defense activates.
          </div>

          <button id="sim-ddos-btn" onClick={handleDDoS} disabled={ddosRunning || !ddosDC}
            className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            {ddosRunning ? <><Loader2 className="w-4 h-4 animate-spin" />Launching...</> : <><Shield className="w-4 h-4" />Launch DDoS Sim</>}
          </button>
        </div>

        {/* Sim 3: Physical Damage */}
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Zap className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Physical Damage</h3>
              <p className="text-xs text-slate-400">Simulate infrastructure failure</p>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <div>
              <label className="section-header block">Target Data Center</label>
              <select className="select-light" value={damageDC} onChange={(e) => setDamageDC(e.target.value)}>
                <option value="">Select DC</option>
                {dataCenters.map((dc) => <option key={dc.id} value={dc.id}>{dc.name}</option>)}
              </select>
            </div>
            <div>
              <label className="section-header block">Damage Type</label>
              <div className="grid grid-cols-3 gap-1">
                {["power", "network", "cooling"].map((t) => (
                  <button key={t} onClick={() => setDamageType(t)}
                    className={`py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                      damageType === t ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-600"
                    }`}>{t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-4 text-xs text-purple-700">
            <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
            DC goes offline. Cyan backup arcs appear from linked DCs.
          </div>

          <button id="sim-damage-btn" onClick={handleDamage} disabled={damageRunning || !damageDC}
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            {damageRunning ? <><Loader2 className="w-4 h-4 animate-spin" />Launching...</> : <><Zap className="w-4 h-4" />Launch Damage Sim</>}
          </button>
        </div>
      </div>

      {/* Active simulation list */}
      {activeSims.length > 0 && (
        <div className="mt-6 card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Active Simulations</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {activeSims.map((sim) => (
              <div key={sim.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <div>
                    <p className="text-sm font-medium text-slate-800 capitalize">{sim.type.replace("_", " ")}</p>
                    <p className="text-xs text-slate-400">Severity: {sim.severity} · Started: {sim.started_at.toLocaleTimeString()}</p>
                  </div>
                </div>
                <button onClick={() => resolveSimulation(sim.id)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-600 transition-colors">
                  Resolve
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Activity, Shield, DollarSign, Server, Cpu, Loader2, ChevronRight } from "lucide-react";
import { useSimulationStore } from "@/store/simulationStore";
import { selectTechnique } from "@/lib/aiEngine";

const CATEGORIES = [
  { id: "traffic", label: "Traffic Optimization", icon: Activity, color: "#2563eb",
    techniques: ["BGP Anycast", "DNS Weighted Routing", "CDN Edge Cache"] },
  { id: "threat", label: "Threat Defense", icon: Shield, color: "#dc2626",
    techniques: ["BGP Null Routing", "IP Blacklisting", "WAF + DPI"] },
  { id: "cost", label: "Cost Analysis", icon: DollarSign, color: "#16a34a",
    techniques: ["VM Live Migration", "Dynamic Power Cap", "Idle Consolidation"] },
  { id: "allocation", label: "DC Allocation", icon: Server, color: "#7c3aed",
    techniques: ["Hot-Cold Aisle", "ToR Switch Balance", "Cross-DC Replication"] },
];

export default function OperationalLogs() {
  const aiDecisions = useSimulationStore((s) => s.aiDecisions);
  const aiTechniques = useSimulationStore((s) => s.aiTechniques);
  const regions = useSimulationStore((s) => s.regions);
  const [activeCategory, setActiveCategory] = useState("traffic");
  const [querying, setQuerying] = useState(false);
  const [liveResult, setLiveResult] = useState<any>(null);

  const [userQuery, setUserQuery] = useState("");

  const avgLoad = Object.values(regions).reduce((s, r) => s + r.load, 0) / Object.values(regions).length;
  const maxThreat = Math.max(...Object.values(regions).map((r) => r.threatLevel));

  const getMetricForCategory = (cat: string): number => {
    if (cat === "traffic") return avgLoad;
    if (cat === "threat") return maxThreat;
    if (cat === "cost") return avgLoad; // lower = more consolidation
    return avgLoad; // allocation
  };

  const handleQueryAI = async () => {
    setQuerying(true);
    setLiveResult(null);
    const cat = CATEGORIES.find((c) => c.id === activeCategory)!;
    const contextMap: Record<string, object> = {
      traffic: { avgLoad: `${(avgLoad * 100).toFixed(0)}%`, regions: Object.values(regions).map((r) => ({ name: r.name, load: `${(r.load * 100).toFixed(0)}%` })) },
      threat: { maxThreat: `${(maxThreat * 100).toFixed(0)}%`, anomalies: Object.values(regions).filter((r) => r.trafficAnomaly).map((r) => r.name) },
      cost: { utilization: `${(avgLoad * 100).toFixed(0)}%`, underutilized: Object.values(regions).filter((r) => r.load < 0.3).map((r) => r.name) },
      allocation: { activeDCs: 10, avgLoad: `${(avgLoad * 100).toFixed(0)}%` },
    };
    const promptMap: Record<string, string> = {
      traffic: `Global average load is ${(avgLoad * 100).toFixed(0)}%. Recommend optimal traffic routing strategy.`,
      threat: `Max threat level: ${(maxThreat * 100).toFixed(0)}%. Recommend best defense posture.`,
      cost: `Average utilization: ${(avgLoad * 100).toFixed(0)}%. Recommend cost optimization strategy.`,
      allocation: `10 active data centers. Recommend server allocation strategy.`,
    };

    let finalPrompt = promptMap[cat.id];
    if (userQuery.trim()) {
      finalPrompt += `\n\nThe user also asked a specific question: "${userQuery}". Please answer this question directly while explaining the active technique.`;
    }

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemType: cat.label, context: contextMap[cat.id], prompt: finalPrompt, userQuery: userQuery.trim() }),
      });
      const data = await res.json();
      setLiveResult({ ...data, questionAsked: userQuery.trim() });
      setUserQuery(""); // Reset after query
    } catch { }
    finally { setQuerying(false); }
  };

  const catDecisions = aiDecisions.filter((d) =>
    d.category.toLowerCase().includes(activeCategory.toLowerCase()) ||
    (activeCategory === "traffic" && d.category === "traffic_optimizer") ||
    (activeCategory === "threat" && d.category === "threat_defense")
  );

  return (
    <div className="p-6">
      <div className="grid grid-cols-4 gap-3 mb-6">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          const metric = getMetricForCategory(cat.id);
          const technique = aiTechniques[cat.id as keyof typeof aiTechniques];
          return (
            <button key={cat.id} id={`op-cat-${cat.id}`} onClick={() => setActiveCategory(cat.id)}
              className={`card p-4 text-left transition-all hover:shadow-md ${ isActive ? "ring-2 ring-blue-500" : "" }`}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${cat.color}18` }}>
                  <Icon className="w-4 h-4" style={{ color: cat.color }} />
                </div>
                <span className="text-xs font-semibold text-slate-600">{cat.label}</span>
              </div>
              <p className="text-xs text-slate-400 mb-1">Active Technique</p>
              <p className="text-sm font-semibold text-slate-800">{technique}</p>
              <div className="mt-2 progress-bar">
                <div className="progress-bar-fill progress-healthy" style={{ width: `${metric * 100}%` }} />
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-5 gap-4">
        {/* Technique panel */}
        <div className="col-span-2 card p-5">
          {(() => {
            const cat = CATEGORIES.find((c) => c.id === activeCategory)!;
            const metric = getMetricForCategory(activeCategory);
            const auto = selectTechnique(activeCategory as any, metric);
            return (
              <>
                <h3 className="font-semibold text-slate-900 mb-4">{cat.label} Techniques</h3>
                <div className="space-y-2 mb-5">
                  {cat.techniques.map((t, i) => {
                    const isSelected = t === auto.name;
                    return (
                      <div key={t} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                        isSelected ? "bg-blue-50 border border-blue-200" : "bg-slate-50"
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${ isSelected ? "bg-blue-600" : "bg-slate-300" }`} />
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${ isSelected ? "text-blue-800" : "text-slate-600" }`}>{t}</p>
                          <p className="text-xs text-slate-400">{["Critical load (>85%)", "Moderate load (>60%)", "Default routing"][i]}</p>
                        </div>
                        {isSelected && <span className="text-xs text-blue-600 font-semibold">AI Active</span>}
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ask AI about this strategy..."
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleQueryAI()}
                    className="flex-1 input-light text-sm"
                  />
                  <button onClick={handleQueryAI} disabled={querying}
                    className="btn-primary px-4 py-2 flex items-center justify-center gap-2 whitespace-nowrap">
                    {querying ? <><Loader2 className="w-4 h-4 animate-spin" />Ask</> : <><Cpu className="w-4 h-4" />Ask</>}
                  </button>
                </div>

                {liveResult && (
                  <div className="mt-4 space-y-3">
                    {liveResult.questionAsked && (
                      <div className="bg-slate-100 rounded-xl p-3 border border-slate-200">
                        <p className="text-xs font-semibold text-slate-500 mb-1">Your Question</p>
                        <p className="text-sm text-slate-800 italic">"{liveResult.questionAsked}"</p>
                      </div>
                    )}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                      <p className="text-xs font-semibold text-blue-800 mb-1">Decision</p>
                      <p className="text-sm text-blue-900">{liveResult.decision}</p>
                    </div>
                    {liveResult.explanation && (
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs font-semibold text-slate-500 mb-1">Explanation</p>
                        <p className="text-xs text-slate-700 leading-relaxed">{liveResult.explanation}</p>
                      </div>
                    )}
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Confidence</span>
                      <span className="font-mono font-medium text-green-600">{liveResult.confidence}%</span>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* Decision log */}
        <div className="col-span-3 card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">AI Decision Log ({catDecisions.length})</h3>
          </div>
          <div className="overflow-y-auto max-h-[520px] divide-y divide-slate-50">
            {catDecisions.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">No AI decisions recorded yet. Trigger a simulation or wait for threshold events.</div>
            ) : (
              catDecisions.map((d) => (
                <div key={d.id} className="px-5 py-4 hover:bg-slate-50">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-slate-800">{d.technique}</span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-400">{d.timestamp.toLocaleString()}</span>
                        <span className="ml-auto text-xs font-mono text-green-600">{d.confidence.toFixed(0)}%</span>
                      </div>
                      <p className="text-sm text-slate-700 font-medium">{d.decision}</p>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">{d.explanation}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

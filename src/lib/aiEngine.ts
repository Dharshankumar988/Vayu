// src/lib/aiEngine.ts
// AI Engine - runs during user session (not always, only when logged in)

import { useSimulationStore } from '@/store/simulationStore';
import { useUIStore } from '@/store/uiStore';
import { supabase } from '@/lib/supabase';

const TECHNIQUES = {
  traffic: [
    { id: 'bgp_anycast', name: 'BGP Anycast', priority: 3, condition: (load: number) => load > 0.85 },
    { id: 'dns_weighted', name: 'DNS Weighted Routing', priority: 2, condition: (load: number) => load > 0.60 },
    { id: 'cdn_edge', name: 'CDN Edge Cache', priority: 1, condition: (_: number) => true },
  ],
  threat: [
    { id: 'bgp_null', name: 'BGP Null Routing', priority: 3, condition: (threat: number) => threat > 0.80 },
    { id: 'ip_blacklist', name: 'IP Blacklisting', priority: 2, condition: (threat: number) => threat > 0.50 },
    { id: 'waf_dpi', name: 'WAF + DPI', priority: 1, condition: (_: number) => true },
  ],
  cost: [
    { id: 'vm_migration', name: 'VM Live Migration', priority: 3, condition: (util: number) => util < 0.30 },
    { id: 'power_cap', name: 'Dynamic Power Cap', priority: 2, condition: (util: number) => util < 0.50 },
    { id: 'idle_consolidate', name: 'Idle Consolidation', priority: 1, condition: (_: number) => true },
  ],
  allocation: [
    { id: 'hot_cold_aisle', name: 'Hot-Cold Aisle', priority: 3, condition: (density: number) => density > 0.70 },
    { id: 'tor_balance', name: 'ToR Switch Balance', priority: 2, condition: (density: number) => density > 0.40 },
    { id: 'cross_dc_repl', name: 'Cross-DC Replication', priority: 1, condition: (_: number) => true },
  ],
};

export function selectTechnique(category: keyof typeof TECHNIQUES, value: number): { id: string; name: string } {
  const list = TECHNIQUES[category];
  const sorted = [...list].sort((a, b) => b.priority - a.priority);
  return sorted.find((t) => t.condition(value)) ?? sorted[sorted.length - 1];
}

async function callGroqAI(systemType: string, context: Record<string, unknown>, prompt: string) {
  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemType, context, prompt }),
    });
    return await res.json();
  } catch {
    return null;
  }
}

let aiLoopInterval: ReturnType<typeof setInterval> | null = null;
let lastCallTime = 0;
const AI_COOLDOWN_MS = 30_000; // call at most every 30s

export function startAILoop() {
  if (aiLoopInterval) return; // already running

  aiLoopInterval = setInterval(async () => {
    const now = Date.now();
    if (now - lastCallTime < AI_COOLDOWN_MS) return;

    const simStore = useSimulationStore.getState();
    const uiStore = useUIStore.getState();
    const regions = simStore.regions;
    
    const avgLoad = Object.values(regions).reduce((s, r) => s + r.load, 0) / Object.values(regions).length;
    const maxThreat = Math.max(...Object.values(regions).map((r) => r.threatLevel));
    const hasAnomaly = Object.values(regions).some((r) => r.trafficAnomaly);
    const activeSims = simStore.simulationEvents.filter((e) => e.active);

    let shouldCall = false;
    let systemType = 'Traffic Optimizer';
    let context: Record<string, unknown> = {};
    let prompt = '';

    if (hasAnomaly || maxThreat > 0.7) {
      shouldCall = true;
      systemType = 'Threat Defense';
      const anomalyRegions = Object.values(regions).filter((r) => r.trafficAnomaly);
      context = { anomalyRegions: anomalyRegions.map((r) => r.name), threatLevel: maxThreat };
      prompt = `Anomalous traffic detected in ${anomalyRegions.map((r) => r.name).join(', ')}. Threat level: ${(maxThreat * 100).toFixed(0)}%. Recommend mitigation.`;
      const technique = selectTechnique('threat', maxThreat);
      simStore.setAITechnique('threat', technique.name);
    } else if (avgLoad > 0.80) {
      shouldCall = true;
      systemType = 'Traffic Optimizer';
      const overloadedRegions = Object.values(regions).filter((r) => r.load > 0.80);
      context = { overloadedRegions: overloadedRegions.map((r) => ({ name: r.name, load: `${(r.load * 100).toFixed(0)}%` })) };
      prompt = `High load detected: ${overloadedRegions.map((r) => `${r.name} at ${(r.load * 100).toFixed(0)}%`).join(', ')}. Optimize traffic routing.`;
      const technique = selectTechnique('traffic', avgLoad);
      simStore.setAITechnique('traffic', technique.name);
    } else if (avgLoad < 0.30) {
      shouldCall = true;
      systemType = 'Cost Efficiency';
      context = { avgLoad: `${(avgLoad * 100).toFixed(0)}%`, underutilizedRegions: Object.values(regions).filter((r) => r.load < 0.30).map((r) => r.name) };
      prompt = `Low utilization detected. Average load: ${(avgLoad * 100).toFixed(0)}%. Recommend cost optimization.`;
      const technique = selectTechnique('cost', avgLoad);
      simStore.setAITechnique('cost', technique.name);
    } else if (activeSims.length > 0) {
      shouldCall = true;
      systemType = 'Allocation';
      context = { activeSims: activeSims.map((s) => ({ type: s.type, severity: s.severity })) };
      prompt = `Active simulation events detected: ${activeSims.map((s) => `${s.type} (${s.severity})`).join(', ')}. Recommend DC allocation strategy.`;
      const technique = selectTechnique('allocation', avgLoad);
      simStore.setAITechnique('allocation', technique.name);
    }

    if (shouldCall) {
      lastCallTime = now;
      const result = await callGroqAI(systemType, context, prompt);
      if (result?.decision) {
        simStore.addAIDecision({
          category: systemType.toLowerCase().replace(' ', '_'),
          technique: simStore.aiTechniques.traffic,
          decision: result.decision,
          explanation: result.explanation,
          confidence: parseFloat(result.confidence ?? '85'),
        });
        uiStore.addNotification({
          type: maxThreat > 0.7 ? 'critical' : avgLoad > 0.80 ? 'warning' : 'info',
          title: `AI: ${systemType}`,
          message: result.decision,
        });
        // Log to Supabase
        await supabase.from('ai_decisions').insert({
          category: systemType.toLowerCase().includes('traffic') ? 'traffic' : systemType.toLowerCase().includes('threat') ? 'threat' : systemType.toLowerCase().includes('cost') ? 'cost' : 'allocation',
          technique_id: 'auto',
          technique_name: simStore.aiTechniques.traffic,
          decision: result.decision,
          explanation: result.explanation,
          confidence: parseFloat(result.confidence ?? '85'),
          trigger_event: prompt.substring(0, 100),
          action_taken: true,
        }).catch(() => {});
      }
    }
  }, 5000); // Check every 5 seconds, but actual API call throttled by cooldown
}

export function stopAILoop() {
  if (aiLoopInterval) {
    clearInterval(aiLoopInterval);
    aiLoopInterval = null;
    lastCallTime = 0;
  }
}

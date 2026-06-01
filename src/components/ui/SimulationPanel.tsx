"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Activity, ShieldAlert, Cpu, Bot, X, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

type AISystem = 'Traffic Optimizer' | 'Threat Defense' | 'Allocation' | 'Cost Efficiency';

export default function SimulationPanel({ onClose, defaultSystem }: { onClose: () => void, defaultSystem?: AISystem }) {
  const [activeSystem, setActiveSystem] = useState<AISystem>(defaultSystem || 'Traffic Optimizer');
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [executed, setExecuted] = useState(false);
  const [result, setResult] = useState<{ decision: string; explanation: string; confidence: string } | null>(null);
  
  const handleSimulate = async () => {
    setLoading(true);
    setResult(null);
    setExecuted(false);
    
    // Mock Context based on selected system
    let context = {};
    let prompt = "";
    
    if (activeSystem === 'Traffic Optimizer') {
      context = { "US-East": "95% Load", "EU-Central": "40% Load" };
      prompt = "US-East data center is approaching critical load due to a regional traffic spike. Determine the best routing strategy.";
    } else if (activeSystem === 'Threat Defense') {
      context = { "AP-Tokyo": "Anomalous traffic spike, 500k req/s from unknown IPs" };
      prompt = "Detect if this is a DDoS attack and suggest mitigation steps.";
    } else if (activeSystem === 'Cost Efficiency') {
      context = { "SA-East": "15% Load, 50 idle servers", "AF-South": "Offline" };
      prompt = "Analyze resource utilization and suggest consolidation.";
    }
    
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemType: activeSystem, context, prompt })
      });
      
      const data = await res.json();
      if (data.decision) {
        setResult(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!result) return;
    setExecuting(true);
    
    try {
      const { error } = await supabase.from('ai_logs').insert([{
        system_type: activeSystem,
        decision: result.decision,
        explanation: result.explanation,
        confidence: parseFloat(result.confidence),
        action_taken: true
      }]);
      
      if (error) console.error("Failed to log AI action:", error);
      
      // Simulate physical action delay
      await new Promise(r => setTimeout(r, 1500));
      
      setExecuted(true);
      setTimeout(() => {
        setExecuted(false);
        setResult(null);
        onClose();
      }, 2500);
    } catch (e) {
      console.error(e);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      className="absolute top-24 right-8 z-30 glass-panel-neon w-96 flex flex-col max-h-[calc(100vh-160px)]"
    >
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2 text-neon-blue">
          <Bot className="w-5 h-5" />
          <h3 className="font-semibold uppercase tracking-wider text-sm text-white">AI Simulator</h3>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
        <div className="flex flex-wrap gap-2">
          {['Traffic Optimizer', 'Threat Defense', 'Cost Efficiency'].map((sys) => (
            <button
              key={sys}
              onClick={() => { setActiveSystem(sys as AISystem); setResult(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                activeSystem === sys 
                  ? 'bg-neon-blue/20 border-neon-blue text-neon-blue' 
                  : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/30'
              }`}
            >
              {sys}
            </button>
          ))}
        </div>

        <div className="bg-black/50 p-4 rounded-lg border border-white/5">
          <h4 className="text-xs text-gray-500 uppercase mb-2">Scenario Context</h4>
          <p className="text-sm text-gray-300">
            {activeSystem === 'Traffic Optimizer' && "High load detected in US-East. EU-Central has excess capacity."}
            {activeSystem === 'Threat Defense' && "Massive anomalous traffic spike detected in AP-Tokyo region."}
            {activeSystem === 'Cost Efficiency' && "Significant underutilization in SA-East data center."}
          </p>
        </div>

        <button 
          onClick={handleSimulate}
          disabled={loading}
          className="w-full py-3 rounded-lg bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="animate-pulse">Analyzing...</span>
          ) : (
            <>
              {activeSystem === 'Traffic Optimizer' && <Activity className="w-4 h-4 text-neon-green" />}
              {activeSystem === 'Threat Defense' && <ShieldAlert className="w-4 h-4 text-neon-red" />}
              {activeSystem === 'Cost Efficiency' && <Cpu className="w-4 h-4 text-neon-purple" />}
              Initiate Simulation
            </>
          )}
        </button>

        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs text-gray-500 uppercase">AI Decision</span>
              <span className="text-xs text-neon-green flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                {result.confidence}% Confidence
              </span>
            </div>
            <div className="bg-neon-blue/10 border border-neon-blue/30 rounded-lg p-3">
              <p className="text-sm text-white font-medium mb-1">{result.decision}</p>
            </div>
            <div className="bg-black/40 rounded-lg p-3">
              <span className="text-xs text-gray-500 uppercase mb-1 block">Explanation</span>
              <p className="text-sm text-gray-300 leading-relaxed">{result.explanation}</p>
            </div>
            
            {executed ? (
              <div className="w-full py-2 mt-2 rounded border border-neon-green/50 bg-neon-green/10 text-neon-green text-xs font-semibold uppercase flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Action Executed
              </div>
            ) : (
              <button 
                onClick={handleExecute}
                disabled={executing}
                className="w-full py-2 mt-2 rounded border border-neon-green text-neon-green hover:bg-neon-green/10 text-xs font-semibold uppercase transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {executing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Executing...</>
                ) : (
                  "Approve & Execute"
                )}
              </button>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

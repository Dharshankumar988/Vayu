"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Server, User, Building, ShieldCheck, ArrowRight, ArrowLeft, CheckCircle, CreditCard, Cpu } from "lucide-react";
import { useAppStore, UserRole } from "@/store";

export default function RegistrationFlow({ onBackToLogin }: { onBackToLogin: () => void }) {
  const setUser = useAppStore(state => state.setUser);
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<UserRole | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    companyName: "",
    fullName: "",
    email: "",
    password: "",
  });

  // Infra Setup State
  const [infraData, setInfraData] = useState({
    region: "us-east",
    serverCount: 10,
    planDuration: 12, // months
  });

  const [loading, setLoading] = useState(false);

  // Dynamic pricing calculation
  const baseServerPrice = 120; // $120 per server/month
  const locationMultiplier = infraData.region === 'us-west' ? 1.2 : infraData.region === 'ap-tokyo' ? 1.5 : 1.0;
  const discount = infraData.planDuration === 12 ? 0.2 : infraData.planDuration === 24 ? 0.3 : 0;
  
  const monthlyCost = (infraData.serverCount * baseServerPrice * locationMultiplier) * (1 - discount);

  const handleComplete = async () => {
    setLoading(true);
    // Simulate API delay for registration and payment processing
    await new Promise(r => setTimeout(r, 2000));
    
    // Auto-login after registration
    setUser({
      id: "new-user-123",
      email: formData.email,
      role: role || 'client',
      company_name: formData.companyName,
      full_name: formData.fullName
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 glass-panel-neon p-8 w-[500px] max-w-[90vw] max-h-[90vh] overflow-y-auto custom-scrollbar"
    >
      <div className="flex items-center justify-between mb-8">
        <button onClick={step === 1 ? onBackToLogin : () => setStep(step - 1)} className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`w-2 h-2 rounded-full ${step >= i ? 'bg-neon-blue shadow-[0_0_8px_rgba(0,243,255,0.8)]' : 'bg-white/20'}`} />
          ))}
        </div>
        <div className="w-5" /> {/* Spacer */}
      </div>

      {step === 1 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Select Designation</h2>
            <p className="text-gray-400 text-sm">Choose your operational role in the Vayu Network</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div 
              onClick={() => { setRole('client'); setStep(2); }}
              className="p-6 border border-white/10 rounded-xl bg-black/40 hover:bg-neon-blue/10 hover:border-neon-blue/50 cursor-pointer transition-all group flex flex-col items-center text-center gap-3"
            >
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-neon-blue/20 group-hover:shadow-[0_0_15px_rgba(0,243,255,0.4)] transition-all">
                <User className="w-6 h-6 text-gray-400 group-hover:text-neon-blue transition-colors" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Client</h3>
                <p className="text-xs text-gray-500">Rent infrastructure and deploy applications globally.</p>
              </div>
            </div>

            <div 
              onClick={() => { setRole('provider'); setStep(2); }}
              className="p-6 border border-white/10 rounded-xl bg-black/40 hover:bg-neon-purple/10 hover:border-neon-purple/50 cursor-pointer transition-all group flex flex-col items-center text-center gap-3"
            >
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-neon-purple/20 group-hover:shadow-[0_0_15px_rgba(181,42,255,0.4)] transition-all">
                <Building className="w-6 h-6 text-gray-400 group-hover:text-neon-purple transition-colors" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Provider</h3>
                <p className="text-xs text-gray-500">Register data centers and lease capacity to clients.</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-4">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-white mb-2">Identity Details</h2>
            <p className="text-gray-400 text-sm">Register your organization credentials</p>
          </div>

          <input 
            type="text" placeholder="Organization / Company Name" 
            value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})}
            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-neon-blue/50 outline-none" 
          />
          <input 
            type="text" placeholder="Full Name" 
            value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})}
            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-neon-blue/50 outline-none" 
          />
          <input 
            type="email" placeholder="Email Address" 
            value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-neon-blue/50 outline-none" 
          />
          <input 
            type="password" placeholder="Secure Password" 
            value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-neon-blue/50 outline-none" 
          />

          <button 
            onClick={() => setStep(3)}
            disabled={!formData.companyName || !formData.email || !formData.password}
            className="w-full mt-4 bg-neon-blue/20 hover:bg-neon-blue/30 text-neon-blue border border-neon-blue/50 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 flex justify-center items-center gap-2"
          >
            Continue <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {step === 3 && role === 'client' && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-5">
          <div className="text-center mb-2">
            <h2 className="text-2xl font-bold text-white mb-2">Configure Infrastructure</h2>
            <p className="text-gray-400 text-sm">Select your initial deployment specifications</p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-400 uppercase">Primary Region</label>
            <select 
              value={infraData.region} onChange={e => setInfraData({...infraData, region: e.target.value})}
              className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white outline-none"
            >
              <option value="us-east">US-East (Virginia)</option>
              <option value="us-west">US-West (California) [+20% premium]</option>
              <option value="eu-central">EU-Central (Frankfurt)</option>
              <option value="ap-tokyo">AP-Tokyo (Japan) [+50% premium]</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-400 uppercase flex justify-between">
              <span>Server Count</span>
              <span className="text-neon-blue">{infraData.serverCount} Units</span>
            </label>
            <input 
              type="range" min="1" max="100" 
              value={infraData.serverCount} onChange={e => setInfraData({...infraData, serverCount: parseInt(e.target.value)})}
              className="w-full accent-neon-blue"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-400 uppercase">Lease Duration</label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 12, 24].map(months => (
                <div 
                  key={months}
                  onClick={() => setInfraData({...infraData, planDuration: months})}
                  className={`p-2 text-center rounded border cursor-pointer transition-colors text-sm ${
                    infraData.planDuration === months 
                      ? 'bg-neon-blue/20 border-neon-blue text-white' 
                      : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/30'
                  }`}
                >
                  {months} {months === 1 ? 'Mo' : 'Mos'}
                  {months === 12 && <div className="text-[10px] text-neon-green">-20%</div>}
                  {months === 24 && <div className="text-[10px] text-neon-green">-30%</div>}
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={() => setStep(4)}
            className="w-full mt-4 bg-neon-blue/20 hover:bg-neon-blue/30 text-neon-blue border border-neon-blue/50 py-3 rounded-lg font-semibold transition-all flex justify-center items-center gap-2"
          >
            Review & Checkout <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Skipping infra step for Providers for brevity, just go to complete */}
      {step === 3 && role === 'provider' && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-4 text-center">
          <Server className="w-16 h-16 text-neon-purple mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Provider Onboarding</h2>
          <p className="text-gray-400 text-sm mb-6">As a provider, you will be able to map your physical data centers to the Vayu network after completing registration.</p>
          <button 
            onClick={handleComplete} disabled={loading}
            className="w-full bg-neon-purple/20 hover:bg-neon-purple/30 text-neon-purple border border-neon-purple/50 py-3 rounded-lg font-semibold transition-all"
          >
            {loading ? "INITIALIZING..." : "COMPLETE REGISTRATION"}
          </button>
        </motion.div>
      )}

      {step === 4 && role === 'client' && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-6">
          <div className="text-center mb-2">
            <h2 className="text-2xl font-bold text-white mb-2">Checkout Details</h2>
            <p className="text-gray-400 text-sm">Review your infrastructure lease</p>
          </div>

          <div className="bg-black/50 border border-white/10 rounded-xl p-5">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/5">
              <span className="text-gray-400">Region</span>
              <span className="text-white font-medium uppercase">{infraData.region}</span>
            </div>
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/5">
              <span className="text-gray-400">Compute Units</span>
              <span className="text-white font-medium">{infraData.serverCount} x Bare Metal</span>
            </div>
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/5">
              <span className="text-gray-400">Commitment</span>
              <span className="text-white font-medium">{infraData.planDuration} Months</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-gray-300 font-semibold">Total Monthly Cost</span>
              <span className="text-2xl font-bold text-neon-green">${monthlyCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input 
              type="text" placeholder="Card Number (Mock)" 
              className="w-full bg-black/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white outline-none focus:border-neon-blue/50" 
            />
          </div>

          <button 
            onClick={handleComplete} disabled={loading}
            className="w-full mt-2 bg-neon-green/20 hover:bg-neon-green/30 text-neon-green border border-neon-green/50 py-3 rounded-lg font-semibold transition-all flex justify-center items-center gap-2 shadow-[0_0_15px_rgba(0,255,102,0.2)]"
          >
            {loading ? "PROCESSING..." : <><ShieldCheck className="w-5 h-5" /> AUTHORIZE PAYMENT & DEPLOY</>}
          </button>
        </motion.div>
      )}

    </motion.div>
  );
}

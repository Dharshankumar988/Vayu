"use client";

import { useState } from "react";
import { useAppStore } from "@/store";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { Lock, User as UserIcon } from "lucide-react";

import RegistrationFlow from "./RegistrationFlow";

export default function LoginPanel() {
  const setUser = useAppStore((state) => state.setUser);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .maybeSingle();

      if (dbError || !data) {
        console.error("Login Error:", dbError);
        setError(dbError?.message ? `Database Error: ${dbError.message}` : "Invalid email or password");
        setLoading(false);
        return;
      }

      setUser({
        id: data.id,
        email: data.email,
        role: data.role,
        company_name: data.company_name,
        full_name: data.full_name
      });

    } catch (err) {
      setError("An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  if (showRegistration) {
    return <RegistrationFlow onBackToLogin={() => setShowRegistration(false)} />;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 glass-panel-neon p-8 w-96 max-w-[90vw]"
    >
      <div className="flex flex-col items-center mb-6">
        <div className="w-16 h-16 rounded-full bg-neon-blue/10 flex items-center justify-center mb-4 border border-neon-blue/30 neon-border">
          <Lock className="w-8 h-8 text-neon-blue" />
        </div>
        <h2 className="text-2xl font-bold text-white text-glow">VAYU ACCESS</h2>
        <p className="text-gray-400 text-sm">Secure Global Infrastructure Portal</p>
      </div>

      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 text-sm p-3 rounded-lg text-center">
            {error}
          </div>
        )}
        
        <div className="relative">
          <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input 
            type="email" 
            placeholder="Identity Designation (Email)" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/50 transition-all"
            required
          />
        </div>
        
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input 
            type="password" 
            placeholder="Security Passkey" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/50 transition-all"
            required
          />
        </div>
        
        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-neon-blue/20 hover:bg-neon-blue/30 text-neon-blue border border-neon-blue/50 py-3 rounded-lg font-semibold tracking-wider transition-all shadow-[0_0_10px_rgba(0,243,255,0.2)] hover:shadow-[0_0_20px_rgba(0,243,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
        >
          {loading ? "AUTHENTICATING..." : "INITIALIZE UPLINK"}
        </button>
      </form>
      
      <button 
        onClick={() => setShowRegistration(true)}
        className="w-full mt-4 text-gray-400 hover:text-white text-sm transition-colors uppercase tracking-wider"
      >
        Establish New Uplink (Register)
      </button>

      <div className="mt-6 border-t border-white/10 pt-4 text-xs text-gray-500 flex flex-col gap-1">
        <p>Demo Accounts:</p>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <span className="text-neon-blue">admin1@vayu.com</span>
          <span className="text-gray-400">admin123</span>
          <span className="text-neon-green">client1@stark.com</span>
          <span className="text-gray-400">client123</span>
          <span className="text-neon-purple">provider1@aws.mock</span>
          <span className="text-gray-400">provider123</span>
        </div>
      </div>
    </motion.div>
  );
}

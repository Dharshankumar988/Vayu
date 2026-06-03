"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Mail, ChevronDown, ChevronUp, Eye, EyeOff, Server } from "lucide-react";
import { useAppStore } from "@/store";
import { supabase } from "@/lib/supabase";
import RegistrationFlow from "./RegistrationFlow";

type LoginType = 'admin' | 'client';

export default function LoginPanel() {
  const setUser = useAppStore((s) => s.setUser);
  const [loginType, setLoginType] = useState<LoginType>('client');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState<'error' | 'pending' | 'rejected' | 'suspended'>('error');
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data: userData, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .maybeSingle();

      if (dbError || !userData) {
        setError("Invalid email or password. Please try again.");
        setErrorType('error');
        return;
      }

      // Role check
      if (loginType === 'admin' && userData.role !== 'admin') {
        setError("This account does not have admin privileges.");
        setErrorType('error');
        return;
      }
      if (loginType === 'client' && userData.role !== 'client') {
        setError("Please use the Admin login tab for admin accounts.");
        setErrorType('error');
        return;
      }

      // Approval check
      if (userData.approval_status === 'pending') {
        setErrorType('pending');
        setError("Your account is pending admin approval. You will be notified once approved.");
        return;
      }
      if (userData.approval_status === 'rejected') {
        setErrorType('rejected');
        setError("Your account registration was rejected. Please contact support.");
        return;
      }
      if (userData.approval_status === 'suspended') {
        setErrorType('suspended');
        setError("Your account has been suspended. Please contact support.");
        return;
      }

      setUser({
        id: userData.id,
        email: userData.email,
        role: userData.role,
        client_type: userData.client_type ?? null,
        full_name: userData.full_name,
        company_name: userData.company_name ?? null,
        country: userData.country ?? null,
        region: userData.region ?? null,
        phone: userData.phone ?? null,
        preferred_dc_region: userData.preferred_dc_region ?? null,
        approval_status: userData.approval_status,
      });
    } catch {
      setError("An error occurred. Please try again.");
      setErrorType('error');
    } finally {
      setLoading(false);
    }
  };

  if (showRegister) {
    return <RegistrationFlow onBackToLogin={() => setShowRegister(false)} />;
  }

  const demoAccounts = [
    { label: 'Admin',        email: 'admin@vayu.com',    pw: 'admin123',  color: '#2563eb', tab: 'admin' as LoginType },
    { label: 'Client (Ind)', email: 'tony@stark.com',   pw: 'client123', color: '#16a34a', tab: 'client' as LoginType },
    { label: 'Client (Org)', email: 'bruce@wayne.com',  pw: 'client123', color: '#7c3aed', tab: 'client' as LoginType },
  ];

  const errorColors = {
    error:     { bg: '#fee2e2', border: '#fca5a5', text: '#dc2626', icon: '⛔' },
    pending:   { bg: '#ede9fe', border: '#c4b5fd', text: '#7c3aed', icon: '⏳' },
    rejected:  { bg: '#fee2e2', border: '#fca5a5', text: '#dc2626', icon: '❌' },
    suspended: { bg: '#fef3c7', border: '#fcd34d', text: '#d97706', icon: '🚫' },
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f5e9 50%, #f3e8ff 100%)' }}>
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="auth-card w-full max-w-md mx-4 overflow-hidden relative"
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-6 text-center border-b border-slate-100">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
            <Server className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Welcome to VAYU</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            A Data Center Infrastructure Management System
          </p>
        </div>

        <div className="px-8 py-6">
          {/* Login type tabs */}
          <div className="flex rounded-xl overflow-hidden border border-slate-200 mb-6">
            {(['client', 'admin'] as LoginType[]).map((type) => (
              <button
                key={type}
                onClick={() => { setLoginType(type); setError(""); }}
                className={`flex-1 py-2.5 text-sm font-600 transition-all ${
                  loginType === type
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                {type === 'admin' ? '🛡️ Admin Login' : '👤 Client Login'}
              </button>
            ))}
          </div>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 rounded-xl p-3 flex items-start gap-2 text-sm"
                style={{
                  background: errorColors[errorType].bg,
                  border: `1px solid ${errorColors[errorType].border}`,
                  color: errorColors[errorType].text,
                }}
              >
                <span>{errorColors[errorType].icon}</span>
                <p className="leading-relaxed">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-600 text-slate-600 mb-1.5 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="login-email"
                  type="email"
                  placeholder={loginType === 'admin' ? 'admin@vayu.com' : 'your@email.com'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-light !pl-10"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-600 text-slate-600 mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-light !pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 mt-1 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing In...</>
              ) : (
                `Sign In as ${loginType === 'admin' ? 'Administrator' : 'Client'}`
              )}
            </button>
          </form>

          {/* Register */}
          <div className="mt-4 text-center">
            <span className="text-sm text-slate-500">New to Vayu? </span>
            <button
              onClick={() => setShowRegister(true)}
              className="text-sm text-blue-600 font-semibold hover:text-blue-700 transition-colors"
            >
              Create an account
            </button>
          </div>

          {/* Demo credentials */}
          <div className="mt-4 border-t border-slate-100 pt-4">
            <button
              onClick={() => setShowDemo(!showDemo)}
              className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-600 transition-colors py-1"
            >
              <span>Demo Credentials</span>
              {showDemo ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            <AnimatePresence>
              {showDemo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 flex flex-col gap-1.5"
                >
                  {demoAccounts.map((acc) => (
                    <button
                      key={acc.email}
                      onClick={() => { setEmail(acc.email); setPassword(acc.pw); setLoginType(acc.tab); }}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors text-xs text-left"
                    >
                      <span className="font-medium" style={{ color: acc.color }}>{acc.label}</span>
                      <span className="text-slate-400 font-mono">{acc.email}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-3 bg-slate-50 border-t border-slate-100 text-center space-y-1">
          <p className="text-xs text-slate-400">Vayu Cloud Infrastructure Management System v2.0</p>
          <p className="text-[10px] text-slate-400">© Designed by Dharshan Kumar B</p>
        </div>
      </motion.div>
    </div>
  );
}

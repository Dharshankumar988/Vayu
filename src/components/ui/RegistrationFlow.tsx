"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, User, Building2, CheckCircle, Server } from "lucide-react";
import { supabase } from "@/lib/supabase";

type AccountType = 'individual' | 'organization';

export default function RegistrationFlow({ onBackToLogin }: { onBackToLogin: () => void }) {
  const [step, setStep] = useState(1);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Individual form fields
  const [indForm, setIndForm] = useState({
    full_name: '', email: '', password: '', country: '', region: '',
    phone: '', intended_usage: '', preferred_dc_region: 'north_america',
    estimated_server_needs: '1-10',
  });

  // Organization form fields
  const [orgForm, setOrgForm] = useState({
    company_name: '', email: '', password: '', contact_person: '',
    organization_type: 'Enterprise', country: '', region: '', phone: '',
    expected_server_count: 10, business_category: 'Tech',
    preferred_dc_region: 'north_america', billing_preference: 'monthly',
  });

  const regions = ['north_america','south_america','europe','asia','africa','oceania'];
  const regionLabels: Record<string,string> = {
    north_america: 'North America', south_america: 'South America',
    europe: 'Europe', asia: 'Asia', africa: 'Africa', oceania: 'Oceania',
  };

  const totalSteps = 3;

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const payload = accountType === 'individual'
        ? { ...indForm, client_type: 'individual', full_name: indForm.full_name, company_name: null }
        : { ...orgForm, client_type: 'organization', full_name: orgForm.contact_person };

      const { error: dbErr } = await supabase.from('users').insert([{
        ...payload,
        role: 'client',
        approval_status: 'pending',
      }]);

      if (dbErr) { setError(dbErr.message); return; }
      setSuccess(true);
    } catch {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f5e9 50%, #f3e8ff 100%)' }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="auth-card w-full max-w-md mx-4 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Registration Submitted</h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Your account is pending admin approval. You will be able to log in once an administrator reviews and approves your registration.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-700">
            ⏳ Approval typically takes 1–2 business days.
          </div>
          <button onClick={onBackToLogin} className="btn-primary w-full py-3">Back to Login</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f5e9 50%, #f3e8ff 100%)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="auth-card w-full max-w-lg mx-4 overflow-hidden"
      >
        {/* Header */}
        <div className="px-8 pt-6 pb-5 border-b border-slate-100 flex items-center gap-4">
          <button onClick={step === 1 ? onBackToLogin : () => setStep(step - 1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Server className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">Create Account — Vayu</h2>
            </div>
            {/* Progress dots */}
            <div className="flex gap-1.5">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${
                  i < step ? 'bg-blue-600' : 'bg-slate-200'
                } ${i === step - 1 ? 'w-6' : 'w-2'}`} />
              ))}
            </div>
          </div>
          <span className="text-xs text-slate-400">{step}/{totalSteps}</span>
        </div>

        <div className="px-8 py-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">

            {/* Step 1: Choose account type */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Account Type</h3>
                <p className="text-sm text-slate-500 mb-6">Choose how you&apos;ll be using Vayu</p>
                <div className="grid grid-cols-2 gap-4">
                  {[{ type: 'individual' as AccountType, icon: User, title: 'Private Individual', desc: 'Personal server hosting and cloud infrastructure.' },
                    { type: 'organization' as AccountType, icon: Building2, title: 'Organization', desc: 'Business or enterprise-level infrastructure management.' }]
                    .map(({ type, icon: Icon, title, desc }) => (
                    <button
                      key={type}
                      onClick={() => { setAccountType(type); setStep(2); }}
                      className={`p-5 border-2 rounded-2xl text-left transition-all hover:shadow-md ${
                        accountType === type ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-3">
                        <Icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <p className="font-semibold text-slate-900 mb-1 text-sm">{title}</p>
                      <p className="text-xs text-slate-500">{desc}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 2: Individual form */}
            {step === 2 && accountType === 'individual' && (
              <motion.div key="step2-ind" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Personal Details</h3>
                <p className="text-sm text-slate-500 mb-5">Tell us about yourself</p>
                <div className="flex flex-col gap-3">
                  {[['Full Name','full_name','text','John Doe'],['Email Address','email','email','john@example.com'],['Password','password','password','Min. 8 characters'],['Country','country','text','USA'],['Phone Number','phone','tel','+1 555 0000']]
                    .map(([label, key, type, placeholder]) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">{label}</label>
                      <input type={type} placeholder={placeholder} value={(indForm as any)[key]}
                        onChange={(e) => setIndForm({ ...indForm, [key]: e.target.value })}
                        className="input-light" />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Intended Usage</label>
                    <select value={indForm.intended_usage} onChange={(e) => setIndForm({ ...indForm, intended_usage: e.target.value })} className="select-light">
                      <option value="">Select usage</option>
                      <option>Personal hosting</option><option>Development / Testing</option>
                      <option>Production workloads</option><option>Research</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Preferred DC Region</label>
                    <select value={indForm.preferred_dc_region} onChange={(e) => setIndForm({ ...indForm, preferred_dc_region: e.target.value })} className="select-light">
                      {regions.map((r) => <option key={r} value={r}>{regionLabels[r]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Estimated Server Needs</label>
                    <select value={indForm.estimated_server_needs} onChange={(e) => setIndForm({ ...indForm, estimated_server_needs: e.target.value })} className="select-light">
                      <option>1-10</option><option>11-50</option><option>51-200</option><option>200+</option>
                    </select>
                  </div>
                </div>
                <button onClick={() => setStep(3)} disabled={!indForm.full_name || !indForm.email || !indForm.password}
                  className="btn-primary w-full mt-5 py-3 flex items-center justify-center gap-2">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* Step 2: Organization form */}
            {step === 2 && accountType === 'organization' && (
              <motion.div key="step2-org" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Organization Details</h3>
                <p className="text-sm text-slate-500 mb-5">Tell us about your organization</p>
                <div className="flex flex-col gap-3">
                  {[['Organization Name','company_name','text','Acme Corp'],['Organization Email','email','email','admin@acme.com'],['Password','password','password','Min. 8 characters'],['Contact Person','contact_person','text','Jane Smith'],['Phone','phone','tel','+1 555 0000'],['Country','country','text','USA']]
                    .map(([label, key, type, placeholder]) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">{label}</label>
                      <input type={type} placeholder={placeholder} value={(orgForm as any)[key]}
                        onChange={(e) => setOrgForm({ ...orgForm, [key]: e.target.value })}
                        className="input-light" />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Organization Type</label>
                    <select value={orgForm.organization_type} onChange={(e) => setOrgForm({ ...orgForm, organization_type: e.target.value })} className="select-light">
                      <option>Enterprise</option><option>Startup</option><option>Government</option><option>NGO</option><option>Education</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Business Category</label>
                    <select value={orgForm.business_category} onChange={(e) => setOrgForm({ ...orgForm, business_category: e.target.value })} className="select-light">
                      <option>Tech</option><option>Finance</option><option>Healthcare</option><option>E-commerce</option><option>Media</option><option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Preferred DC Region</label>
                    <select value={orgForm.preferred_dc_region} onChange={(e) => setOrgForm({ ...orgForm, preferred_dc_region: e.target.value })} className="select-light">
                      {regions.map((r) => <option key={r} value={r}>{regionLabels[r]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Expected Server Count: {orgForm.expected_server_count}</label>
                    <input type="range" min="1" max="500" value={orgForm.expected_server_count}
                      onChange={(e) => setOrgForm({ ...orgForm, expected_server_count: parseInt(e.target.value) })} className="w-full" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Billing Preference</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['monthly','annual'].map((pref) => (
                        <button key={pref} onClick={() => setOrgForm({ ...orgForm, billing_preference: pref })}
                          className={`py-2 rounded-xl border text-sm font-medium transition-all capitalize ${
                            orgForm.billing_preference === pref ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-blue-300'
                          }`}>
                          {pref}{pref === 'annual' && <span className="text-xs text-green-600 ml-1">(-20%)</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <button onClick={() => setStep(3)} disabled={!orgForm.company_name || !orgForm.email || !orgForm.password}
                  className="btn-primary w-full mt-5 py-3 flex items-center justify-center gap-2">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* Step 3: Review & Submit */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Review & Submit</h3>
                <p className="text-sm text-slate-500 mb-5">Confirm your registration details</p>
                <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm mb-5">
                  {accountType === 'individual' ? (
                    <>
                      <div className="flex justify-between"><span className="text-slate-500">Name</span><span className="font-medium">{indForm.full_name}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="font-medium">{indForm.email}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Country</span><span className="font-medium">{indForm.country}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Preferred Region</span><span className="font-medium">{regionLabels[indForm.preferred_dc_region]}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Server Needs</span><span className="font-medium">{indForm.estimated_server_needs}</span></div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between"><span className="text-slate-500">Organization</span><span className="font-medium">{orgForm.company_name}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="font-medium">{orgForm.email}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Type</span><span className="font-medium">{orgForm.organization_type}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Expected Servers</span><span className="font-medium">{orgForm.expected_server_count}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Billing</span><span className="font-medium capitalize">{orgForm.billing_preference}</span></div>
                    </>
                  )}
                  <div className="flex justify-between"><span className="text-slate-500">Account Type</span><span className="font-medium capitalize">{accountType}</span></div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-xs text-amber-700">
                  ⏳ Your account will be reviewed by an administrator before you can log in.
                </div>
                {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
                <button onClick={handleSubmit} disabled={loading}
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                  {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Submitting...</> : 'Submit Registration'}
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

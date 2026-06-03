"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, ShieldCheck, Ban, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useAppStore } from "@/store";
import { useUIStore } from "@/store/uiStore";

interface UserRecord {
  id: string; email: string; full_name: string; role: string;
  client_type: string | null; approval_status: string;
  company_name: string | null; organization_type: string | null;
  country: string | null; preferred_dc_region: string | null;
  phone: string | null; intended_usage: string | null;
  estimated_server_needs: string | null; expected_server_count: number | null;
  billing_preference: string | null; created_at: string;
}

export default function UserApproval() {
  const user = useAppStore((s) => s.user);
  const addNotification = useUIStore((s) => s.addNotification);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "suspended" | "all">("pending");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list_all" }),
      });
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch { setUsers([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const doAction = async (userId: string, action: string, label: string) => {
    setProcessing(userId);
    try {
      await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userId, adminId: user?.id }),
      });
      addNotification({ type: action === "approve" ? "success" : "warning", title: label, message: `User action applied successfully.` });
      await fetchUsers();
    } catch { } finally { setProcessing(null); }
  };

  const filtered = filter === "all" ? users : users.filter((u) => u.approval_status === filter);
  const counts = {
    pending: users.filter((u) => u.approval_status === "pending").length,
    approved: users.filter((u) => u.approval_status === "approved").length,
    rejected: users.filter((u) => u.approval_status === "rejected").length,
    suspended: users.filter((u) => u.approval_status === "suspended").length,
  };

  const statusColors: Record<string, string> = {
    pending: "badge-pending", approved: "badge-healthy", rejected: "badge-critical", suspended: "badge-warning",
  };

  return (
    <div className="p-6 max-w-4xl">
      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(["pending", "approved", "rejected", "suspended", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize flex items-center gap-2 ${
              filter === f ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}>
            {f}{f !== "all" && counts[f] > 0 && (
              <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${
                filter === f ? "bg-white/20 text-white" : "bg-slate-300 text-slate-700"
              }`}>{counts[f]}</span>
            )}
          </button>
        ))}
        <button onClick={fetchUsers} className="ml-auto btn-ghost px-4 py-2 flex items-center gap-2">
          <Loader2 className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          No {filter === "all" ? "" : filter} users found.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((u) => (
            <div key={u.id} className="card overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                    {u.full_name?.[0] ?? "?"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900 text-sm">{u.full_name}</p>
                      <span className={`badge ${statusColors[u.approval_status] ?? "badge-info"}`}>{u.approval_status}</span>
                      {u.client_type && <span className="badge badge-info capitalize">{u.client_type}</span>}
                    </div>
                    <p className="text-xs text-slate-400">{u.email} · {u.company_name ?? "Individual"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Action buttons */}
                  {u.approval_status === "pending" && (
                    <>
                      <button onClick={() => doAction(u.id, "approve", "User Approved")}
                        disabled={processing === u.id}
                        className="btn-success flex items-center gap-1.5 text-xs px-3 py-2">
                        {processing === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />} Approve
                      </button>
                      <button onClick={() => doAction(u.id, "reject", "User Rejected")}
                        disabled={processing === u.id}
                        className="btn-danger flex items-center gap-1.5 text-xs px-3 py-2">
                        <XCircle className="w-3 h-3" /> Reject
                      </button>
                    </>
                  )}
                  {u.approval_status === "approved" && (
                    <>
                      <button onClick={() => doAction(u.id, "promote", "User Promoted to Admin")}
                        disabled={processing === u.id}
                        className="flex items-center gap-1 text-xs px-3 py-2 rounded-lg border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors">
                        <ShieldCheck className="w-3 h-3" /> Promote
                      </button>
                      <button onClick={() => doAction(u.id, "suspend", "User Suspended")}
                        disabled={processing === u.id}
                        className="btn-danger flex items-center gap-1.5 text-xs px-3 py-2">
                        <Ban className="w-3 h-3" /> Suspend
                      </button>
                    </>
                  )}
                  {(u.approval_status === "rejected" || u.approval_status === "suspended") && (
                    <button onClick={() => doAction(u.id, "approve", "User Re-approved")}
                      disabled={processing === u.id}
                      className="btn-success flex items-center gap-1.5 text-xs px-3 py-2">
                      <CheckCircle className="w-3 h-3" /> Re-approve
                    </button>
                  )}
                  <button onClick={() => setExpanded(expanded === u.id ? null : u.id)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                    {expanded === u.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {expanded === u.id && (
                <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 grid grid-cols-3 gap-3 text-xs">
                  {[
                    ["Country", u.country], ["Phone", u.phone], ["Preferred Region", u.preferred_dc_region?.replace("_", " ")],
                    ["Org Type", u.organization_type], ["Business", u.billing_preference], ["Est. Servers", u.estimated_server_needs ?? u.expected_server_count],
                    ["Registered", new Date(u.created_at).toLocaleDateString()], ["Intended Use", u.intended_usage], ["Client Type", u.client_type],
                  ].map(([label, value]) => value ? (
                    <div key={label as string}>
                      <p className="text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
                      <p className="text-slate-700 font-medium capitalize">{value as string}</p>
                    </div>
                  ) : null)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

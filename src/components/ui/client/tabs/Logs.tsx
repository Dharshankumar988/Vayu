"use client";

import { useState } from "react";
import { useAppStore } from "@/store";
import { useDCStore } from "@/store/dcStore";
import { FileText, Activity, Globe, RefreshCw } from "lucide-react";

const SAMPLE_LOGS = [
  { id: "1", timestamp: new Date(Date.now() - 3600000), event: "Server Started", region_origin: "North America", status: "success", duration_ms: 234 },
  { id: "2", timestamp: new Date(Date.now() - 7200000), event: "Health Check", region_origin: "North America", status: "success", duration_ms: 12 },
  { id: "3", timestamp: new Date(Date.now() - 14400000), event: "Traffic Rerouted", region_origin: "Asia", status: "info", duration_ms: 89 },
  { id: "4", timestamp: new Date(Date.now() - 86400000), event: "Backup Created", region_origin: "North America", status: "success", duration_ms: 1240 },
  { id: "5", timestamp: new Date(Date.now() - 172800000), event: "Server Provisioned", region_origin: "North America", status: "success", duration_ms: 4500 },
];

export default function Logs() {
  const user = useAppStore((s) => s.user);
  const dataCenters = useDCStore((s) => s.dataCenters);
  const [logs] = useState(SAMPLE_LOGS);

  const mySlots = dataCenters.flatMap((dc) =>
    dc.rooms.flatMap((room) =>
      room.racks.flatMap((rack) =>
        rack.slots.filter((s) => s.client_id === user?.id).map((s) => ({
          ...s, dcName: dc.name, region: dc.region,
        }))
      )
    )
  );

  const uptimePct = mySlots.length > 0 ? 99.7 : 0;
  const reqPerMin = mySlots.length * 120;
  const hostingRegion = mySlots[0]?.region ?? "N/A";

  return (
    <div className="p-6 max-w-4xl">
      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Uptime", value: `${uptimePct}%`, icon: Activity, color: "#16a34a" },
          { label: "Req/min (est.)", value: reqPerMin.toLocaleString(), icon: Globe, color: "#2563eb" },
          { label: "Hosting Region", value: hostingRegion.replace("_", " "), icon: Globe, color: "#7c3aed" },
          { label: "Active Servers", value: mySlots.length, icon: FileText, color: "#0891b2" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4" style={{ color }} />
              <span className="text-xs text-slate-500">{label}</span>
            </div>
            <p className="text-xl font-bold text-slate-900 capitalize">{value}</p>
          </div>
        ))}
      </div>

      {/* Log table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Activity Logs</h3>
          <button className="btn-ghost px-3 py-1.5 flex items-center gap-1.5 text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Event</th>
                <th>Origin Region</th>
                <th>Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="font-mono text-xs text-slate-500">{log.timestamp.toLocaleString()}</td>
                  <td className="font-medium">{log.event}</td>
                  <td className="text-slate-500">{log.region_origin}</td>
                  <td className="font-mono text-xs">{log.duration_ms}ms</td>
                  <td>
                    <span className={`badge ${ log.status === "success" ? "badge-healthy" : log.status === "info" ? "badge-info" : "badge-warning" }`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
              {mySlots.length === 0 && (
                <tr><td colSpan={5} className="text-center text-slate-400 py-8">No server activity. Host a server to see logs.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

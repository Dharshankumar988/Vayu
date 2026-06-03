"use client";

import { useState } from "react";
import { Plus, Link2, Unlink, Server, Users, MapPin, RefreshCw } from "lucide-react";
import { useDCStore } from "@/store/dcStore";
import { useSimulationStore } from "@/store/simulationStore";
import { useUIStore } from "@/store/uiStore";

const DC_REGIONS = [
  { id: "north_america", name: "North America" },
  { id: "south_america", name: "South America" },
  { id: "europe",        name: "Europe" },
  { id: "asia",          name: "Asia" },
  { id: "africa",        name: "Africa" },
  { id: "oceania",       name: "Oceania" },
];

export default function AdminControls() {
  const dataCenters = useDCStore((s) => s.dataCenters);
  const addDataCenter = useDCStore((s) => s.addDataCenter);
  const linkDataCenters = useDCStore((s) => s.linkDataCenters);
  const unlinkDataCenters = useDCStore((s) => s.unlinkDataCenters);
  const setIsolated = useDCStore((s) => s.setIsolated);
  const regions = useSimulationStore((s) => s.regions);
  const setRegionUsers = useSimulationStore((s) => s.setRegionUsers);
  const addNotification = useUIStore((s) => s.addNotification);

  const [newDC, setNewDC] = useState({ name: "", lat: "", lng: "", region: "north_america", capacity: "100", location: "" });
  const [linkA, setLinkA] = useState("");
  const [linkB, setLinkB] = useState("");
  const [activeSection, setActiveSection] = useState<"dc" | "link" | "users" | "load">("dc");

  const handleCreateDC = () => {
    if (!newDC.name || !newDC.lat || !newDC.lng) return;
    const dc = {
      id: `dc-custom-${Date.now()}`,
      name: newDC.name,
      location: newDC.location || `${newDC.lat}, ${newDC.lng}`,
      region: newDC.region as any,
      lat: parseFloat(newDC.lat),
      lng: parseFloat(newDC.lng),
      status: "healthy" as const,
      load: 0,
      health_score: 100,
      total_capacity: parseInt(newDC.capacity),
      is_isolated: false,
      linked_dc_ids: [],
      rooms: [],
    };
    addDataCenter(dc);
    addNotification({ type: "success", title: "Data Center Created", message: `${newDC.name} added to ${newDC.region}.` });
    setNewDC({ name: "", lat: "", lng: "", region: "north_america", capacity: "100", location: "" });
  };

  const handleLink = () => {
    if (!linkA || !linkB || linkA === linkB) return;
    linkDataCenters(linkA, linkB);
    const nameA = dataCenters.find((d) => d.id === linkA)?.name;
    const nameB = dataCenters.find((d) => d.id === linkB)?.name;
    addNotification({ type: "info", title: "DC Link Created", message: `${nameA} ↔ ${nameB} backup link established.` });
    setLinkA(""); setLinkB("");
  };

  const SectionBtn = ({ id, label }: { id: typeof activeSection; label: string }) => (
    <button
      onClick={() => setActiveSection(id)}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        activeSection === id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex gap-2 mb-6 flex-wrap">
        <SectionBtn id="dc"    label="Data Centers" />
        <SectionBtn id="link"  label="DC Links & Isolation" />
        <SectionBtn id="users" label="Regional Load" />
      </div>

      {/* Create Data Center */}
      {activeSection === "dc" && (
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Plus className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-slate-900">Create New Data Center</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="section-header block">Name</label>
                <input className="input-light" placeholder="Vayu EU-South" value={newDC.name} onChange={(e) => setNewDC({ ...newDC, name: e.target.value })} />
              </div>
              <div>
                <label className="section-header block">Location</label>
                <input className="input-light" placeholder="Milan, Italy" value={newDC.location} onChange={(e) => setNewDC({ ...newDC, location: e.target.value })} />
              </div>
              <div>
                <label className="section-header block">Latitude</label>
                <input className="input-light" placeholder="45.4654" value={newDC.lat} onChange={(e) => setNewDC({ ...newDC, lat: e.target.value })} />
              </div>
              <div>
                <label className="section-header block">Longitude</label>
                <input className="input-light" placeholder="9.1866" value={newDC.lng} onChange={(e) => setNewDC({ ...newDC, lng: e.target.value })} />
              </div>
              <div>
                <label className="section-header block">Region</label>
                <select className="select-light" value={newDC.region} onChange={(e) => setNewDC({ ...newDC, region: e.target.value })}>
                  {DC_REGIONS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="section-header block">Capacity (servers)</label>
                <input className="input-light" type="number" placeholder="100" value={newDC.capacity} onChange={(e) => setNewDC({ ...newDC, capacity: e.target.value })} />
              </div>
            </div>
            <button onClick={handleCreateDC} disabled={!newDC.name || !newDC.lat || !newDC.lng} className="btn-primary mt-4 px-6 py-2.5">
              Create Data Center
            </button>
          </div>

          {/* Existing DC table */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">All Data Centers ({dataCenters.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Name</th><th>Region</th><th>Location</th><th>Load</th><th>Status</th><th>Isolated</th></tr></thead>
                <tbody>
                  {dataCenters.map((dc) => (
                    <tr key={dc.id}>
                      <td className="font-medium">{dc.name}</td>
                      <td className="capitalize text-slate-500">{dc.region.replace("_", " ")}</td>
                      <td className="text-slate-500">{dc.location}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="progress-bar w-20">
                            <div className={`progress-bar-fill ${ dc.load > 0.85 ? "progress-critical" : dc.load > 0.65 ? "progress-warning" : "progress-healthy" }`} style={{ width: `${dc.load * 100}%` }} />
                          </div>
                          <span className="text-xs text-slate-500">{(dc.load * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td><span className={`badge ${ dc.status === "healthy" ? "badge-healthy" : dc.status === "warning" ? "badge-warning" : "badge-critical" }`}>{dc.status}</span></td>
                      <td>
                        <button onClick={() => setIsolated(dc.id, !dc.is_isolated)}
                          className={`text-xs px-2 py-1 rounded-lg border transition-colors ${ dc.is_isolated ? "border-red-300 bg-red-50 text-red-600" : "border-slate-200 text-slate-500 hover:border-slate-300" }`}>
                          {dc.is_isolated ? "Isolated" : "Connected"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DC Links */}
      {activeSection === "link" && (
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Link2 className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-slate-900">Link Data Centers (Backup / Redundancy)</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="section-header block">Data Center A</label>
                <select className="select-light" value={linkA} onChange={(e) => setLinkA(e.target.value)}>
                  <option value="">Select DC</option>
                  {dataCenters.map((dc) => <option key={dc.id} value={dc.id}>{dc.name}</option>)}
                </select>
              </div>
              <div>
                <label className="section-header block">Data Center B</label>
                <select className="select-light" value={linkB} onChange={(e) => setLinkB(e.target.value)}>
                  <option value="">Select DC</option>
                  {dataCenters.filter((d) => d.id !== linkA).map((dc) => <option key={dc.id} value={dc.id}>{dc.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleLink} disabled={!linkA || !linkB} className="btn-primary px-6">
                <Link2 className="w-4 h-4 inline mr-2" />Establish Link
              </button>
              <button onClick={() => { unlinkDataCenters(linkA, linkB); setLinkA(""); setLinkB(""); }}
                disabled={!linkA || !linkB} className="btn-ghost px-6">
                <Unlink className="w-4 h-4 inline mr-2" />Remove Link
              </button>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Current Links</h2>
            </div>
            <div className="p-4 space-y-2">
              {dataCenters.filter((dc) => dc.linked_dc_ids.length > 0).map((dc) =>
                dc.linked_dc_ids.map((linkedId) => {
                  const linked = dataCenters.find((d) => d.id === linkedId);
                  if (!linked || linked.id < dc.id) return null; // dedup
                  return (
                    <div key={`${dc.id}-${linkedId}`} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-800">{dc.name}</span>
                        <Link2 className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium text-slate-800">{linked.name}</span>
                      </div>
                      <span className="badge badge-info">backup</span>
                    </div>
                  );
                })
              )}
              {dataCenters.every((dc) => dc.linked_dc_ids.length === 0) && (
                <p className="text-slate-400 text-sm py-4 text-center">No DC links established.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Regional Load */}
      {activeSection === "users" && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-6">
            <RefreshCw className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-slate-900">Regional User Load Control</h2>
          </div>
          <div className="grid grid-cols-2 gap-6">
            {Object.values(regions).map((region) => (
              <div key={region.id} className="bg-slate-50 rounded-xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium text-slate-900 text-sm">{region.name}</h3>
                  <span className={`badge ${ region.load > 0.85 ? "badge-critical" : region.load > 0.65 ? "badge-warning" : "badge-healthy" }`}>
                    {(region.load * 100).toFixed(0)}% load
                  </span>
                </div>
                <div className="mb-2">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Active Users</span>
                    <span className="font-mono font-medium">{region.users.toLocaleString()}</span>
                  </div>
                  <input type="range" min="100000" max="5000000" step="100000" value={region.users}
                    onChange={(e) => setRegionUsers(region.id, parseInt(e.target.value))}
                    className="w-full accent-neon" />
                </div>
                <div className="progress-bar">
                  <div className={`progress-bar-fill ${ region.load > 0.85 ? "progress-critical" : region.load > 0.65 ? "progress-warning" : "progress-healthy" }`}
                    style={{ width: `${region.load * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

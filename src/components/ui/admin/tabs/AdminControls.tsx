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
  const addRoom = useDCStore((s) => s.addRoom);
  const removeRoom = useDCStore((s) => s.removeRoom);
  const renameRoom = useDCStore((s) => s.renameRoom);
  const reorderRooms = useDCStore((s) => s.reorderRooms);
  const regions = useSimulationStore((s) => s.regions);
  const setRegionUsers = useSimulationStore((s) => s.setRegionUsers);
  const addNotification = useUIStore((s) => s.addNotification);

  const [newDC, setNewDC] = useState({ name: "", lat: "", lng: "", region: "north_america", location: "", numRooms: 1, racksPerRoom: 4 });
  const [linkA, setLinkA] = useState("");
  const [linkB, setLinkB] = useState("");
  const [activeSection, setActiveSection] = useState<"dc" | "rooms" | "link" | "users">("dc");
  const [selectedDcForRooms, setSelectedDcForRooms] = useState<string>("");
  const [newRoomName, setNewRoomName] = useState("");

  const handleCreateDC = () => {
    if (!newDC.name || !newDC.lat || !newDC.lng) return;
    
    // Generate actual infrastructure based on input
    const generatedRooms = [];
    let slotCounter = 1;
    for (let r = 0; r < newDC.numRooms; r++) {
      const room = {
        id: `room-${Date.now()}-${r}`,
        name: `Room ${String.fromCharCode(65 + r)}`,
        racks: [] as any[],
      };
      for (let k = 0; k < newDC.racksPerRoom; k++) {
        const rack = {
          id: `rack-${Date.now()}-${r}-${k}`,
          name: `Rack ${k + 1}`,
          slots: [] as any[],
        };
        for (let s = 0; s < 4; s++) { // 4 slots per rack
          rack.slots.push({
            id: `slot-${Date.now()}-${r}-${k}-${s}`,
            position: slotCounter++,
            status: "available",
            client_id: null,
            client_name: null,
            server_name: null,
            cpu_util: 0,
            mem_util: 0,
            health: "healthy",
          });
        }
        room.racks.push(rack);
      }
      generatedRooms.push(room);
    }
    
    const calculatedCapacity = newDC.numRooms * newDC.racksPerRoom * 4;

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
      total_capacity: calculatedCapacity,
      is_isolated: false,
      linked_dc_ids: [],
      rooms: generatedRooms,
    };
    addDataCenter(dc);
    addNotification({ type: "success", title: "Data Center Created", message: `${newDC.name} added to ${newDC.region} with ${calculatedCapacity} slots.` });
    setNewDC({ name: "", lat: "", lng: "", region: "north_america", location: "", numRooms: 1, racksPerRoom: 4 });
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
        <SectionBtn id="rooms" label="Rooms & Infrastructure" />
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
                <label className="section-header block">Number of Rooms (Max 3)</label>
                <input className="input-light" type="number" min="1" max="3" placeholder="1" value={newDC.numRooms} onChange={(e) => setNewDC({ ...newDC, numRooms: Math.min(3, Math.max(1, parseInt(e.target.value) || 1)) })} />
              </div>
              <div>
                <label className="section-header block">Racks per Room (Max 6)</label>
                <input className="input-light" type="number" min="1" max="6" placeholder="4" value={newDC.racksPerRoom} onChange={(e) => setNewDC({ ...newDC, racksPerRoom: Math.min(6, Math.max(1, parseInt(e.target.value) || 1)) })} />
              </div>
            </div>
            <button onClick={handleCreateDC} disabled={!newDC.name || !newDC.lat || !newDC.lng} className="btn-primary mt-4 px-6 py-2.5">
              Create Data Center ({newDC.numRooms * newDC.racksPerRoom * 4} Slots)
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

      {/* Rooms Management */}
      {activeSection === "rooms" && (
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Server className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-slate-900">Manage Rooms</h2>
            </div>
            
            <div className="mb-4">
              <label className="section-header block">Select Data Center</label>
              <select 
                className="select-light w-full max-w-md" 
                value={selectedDcForRooms} 
                onChange={(e) => setSelectedDcForRooms(e.target.value)}
              >
                <option value="">-- Choose Data Center --</option>
                {dataCenters.map(dc => (
                  <option key={dc.id} value={dc.id}>{dc.name}</option>
                ))}
              </select>
            </div>

            {selectedDcForRooms && (
              <>
                <div className="flex gap-2 mb-6">
                  <input 
                    className="input-light flex-1 max-w-sm" 
                    placeholder="New Room Name (e.g. Room C)" 
                    value={newRoomName} 
                    onChange={(e) => setNewRoomName(e.target.value)}
                  />
                  <button 
                    onClick={async () => {
                      if (!newRoomName) return;
                      const res = await addRoom(selectedDcForRooms, newRoomName);
                      if (res) {
                        addNotification({ type: "success", title: "Room Added", message: `${newRoomName} created successfully.` });
                        setNewRoomName("");
                      }
                    }}
                    className="btn-primary px-4"
                  >
                    <Plus className="w-4 h-4 inline mr-1" /> Add Room
                  </button>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="data-table w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left">Room Name</th>
                        <th className="px-4 py-3 text-left">Racks</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dataCenters.find(d => d.id === selectedDcForRooms)?.rooms?.map((room, idx, arr) => (
                        <tr key={room.id} className="border-t border-slate-100">
                          <td className="px-4 py-3">
                            <input 
                              type="text" 
                              className="input-light py-1 text-sm bg-transparent"
                              defaultValue={room.name}
                              onBlur={(e) => {
                                if (e.target.value !== room.name) {
                                  renameRoom(room.id, e.target.value);
                                }
                              }}
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500">
                            {room.racks?.length || 0} racks
                          </td>
                          <td className="px-4 py-3 text-right space-x-2">
                            <button
                              onClick={() => {
                                if (idx > 0) {
                                  const newOrder = [...arr.map(r => r.id)];
                                  [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
                                  reorderRooms(selectedDcForRooms, newOrder);
                                }
                              }}
                              disabled={idx === 0}
                              className="text-xs px-2 py-1 bg-slate-100 rounded hover:bg-slate-200 disabled:opacity-50"
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => {
                                if (idx < arr.length - 1) {
                                  const newOrder = [...arr.map(r => r.id)];
                                  [newOrder[idx + 1], newOrder[idx]] = [newOrder[idx], newOrder[idx + 1]];
                                  reorderRooms(selectedDcForRooms, newOrder);
                                }
                              }}
                              disabled={idx === arr.length - 1}
                              className="text-xs px-2 py-1 bg-slate-100 rounded hover:bg-slate-200 disabled:opacity-50"
                            >
                              ↓
                            </button>
                            <button 
                              onClick={async () => {
                                if(confirm(`Are you sure you want to delete ${room.name}?`)) {
                                   const success = await removeRoom(selectedDcForRooms, room.id);
                                   if(success) {
                                      addNotification({ type: "success", title: "Room Removed", message: `${room.name} deleted.` });
                                   } else {
                                      addNotification({ type: "error", title: "Error", message: "Cannot remove room (may have occupied slots)." });
                                   }
                                }
                              }}
                              className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {(!dataCenters.find(d => d.id === selectedDcForRooms)?.rooms || dataCenters.find(d => d.id === selectedDcForRooms)?.rooms?.length === 0) && (
                        <tr><td colSpan={3} className="text-center py-4 text-slate-500 text-sm">No rooms found. Add one above.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
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

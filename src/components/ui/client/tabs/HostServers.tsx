"use client";

import { useState, useMemo } from "react";
import { useDCStore } from "@/store/dcStore";
import { useAppStore } from "@/store";
import { useUIStore } from "@/store/uiStore";
import { MapPin, Server, DollarSign, CreditCard, CheckCircle, ChevronRight, Trash2, Cpu } from "lucide-react";
import dynamic from "next/dynamic";

const GlobeView = dynamic(() => import("@/components/3d/Layer1/GlobeView"), { ssr: false });

const DataCenterInterior = dynamic(
  () => import("@/components/3d/Layer3/DataCenterInterior"),
  { ssr: false }
);

const REGIONS = [
  { id: "north_america", name: "North America" },
  { id: "south_america", name: "South America" },
  { id: "europe", name: "Europe" },
  { id: "asia", name: "Asia" },
  { id: "africa", name: "Africa" },
  { id: "oceania", name: "Oceania" },
];

export default function HostServers() {
  const user = useAppStore((s) => s.user);
  const setSelectedDataCenterId = useAppStore((s) => s.setSelectedDataCenterId);
  const dataCenters = useDCStore((s) => s.dataCenters);
  const updateSlotStatus = useDCStore((s) => s.updateSlotStatus);
  const addNotification = useUIStore((s) => s.addNotification);

  const [step, setStep] = useState<"region" | "dc" | "interior" | "billing" | "success">("region");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedDCId, setSelectedDCId] = useState("");
  const selectedSlotIds = useAppStore((s) => s.selectedSlotIds);
  const clearSelectedSlots = useAppStore((s) => s.clearSelectedSlots);
  const setSelectedRegionId = useAppStore((s) => s.setSelectedRegionId);
  const [serverName, setServerName] = useState("");
  const [duration, setDuration] = useState(1);
  const [paying, setPaying] = useState(false);
  const [activeTab, setActiveTab] = useState<"host" | "manage">("host");
  
  // Deletion modal state
  const [terminatingSlotId, setTerminatingSlotId] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");

  const regionDCs = useMemo(
    () => dataCenters.filter((dc) => dc.region === selectedRegion && !dc.is_isolated),
    [dataCenters, selectedRegion]
  );

  const selectedDC = dataCenters.find((d) => d.id === selectedDCId);

  // Count available slots in selected DC
  const availableSlots = useMemo(() => {
    if (!selectedDC) return 0;
    return selectedDC.rooms
      .flatMap((r) => r.racks.flatMap((rack) => rack.slots))
      .filter((s) => s.status === "available").length;
  }, [selectedDC]);

  const deployableSlots = useMemo(() => {
    if (!selectedDC) return [];
    const allSlots = selectedDC.rooms.flatMap(r => r.racks.flatMap(rk => rk.slots));
    return selectedSlotIds.filter(id => {
      const s = allSlots.find(slot => slot.id === id);
      return s?.status === "available";
    });
  }, [selectedSlotIds, selectedDC]);

  const userSlots = useMemo(() => {
    if (!user) return [];
    return dataCenters.flatMap((dc) =>
      dc.rooms.flatMap((r) =>
        r.racks.flatMap((rack) =>
          rack.slots.filter((s) => s.client_id === user.id).map((s) => ({ ...s, dcName: dc.name, region: dc.region }))
        )
      )
    );
  }, [dataCenters, user]);

  const SLOT_PRICE = 120; // $120/slot/month
  const discount = duration >= 12 ? 0.2 : duration >= 6 ? 0.1 : 0;
  const slotCount = deployableSlots.length || 1;
  const totalCost = SLOT_PRICE * duration * slotCount * (1 - discount);

  const handleSelectDC = (dcId: string) => {
    setSelectedDCId(dcId);
    setSelectedDataCenterId(dcId);
    setStep("interior");
  };

  const handlePayment = async () => {
    setPaying(true);
    await new Promise((r) => setTimeout(r, 2000));
    // Update all selected available slots in store
    deployableSlots.forEach((id) => {
      updateSlotStatus(id, "occupied", user?.id, user?.full_name, serverName || "My Server");
    });
    addNotification({
      type: "success",
      title: "Servers Hosted!",
      message: `${serverName || "Your servers"} are now live in ${selectedDC?.name}.`,
    });
    setPaying(false);
    setStep("success");
  };

  if (step === "success") {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Server Deployed!</h2>
        <p className="text-slate-500 mb-6 text-center max-w-sm">
          {serverName || "Your server"} has been successfully deployed in {selectedDC?.name}.
          You can monitor its health in the Reports tab.
        </p>
        <div className="bg-green-50 border border-green-200 rounded-xl px-6 py-3 text-green-700 text-sm font-medium mb-6">
          Monthly cost: ${SLOT_PRICE.toFixed(2)}
        </div>
        <button
          onClick={() => {
            setStep("region");
            clearSelectedSlots();
            setSelectedDCId("");
            setSelectedRegion("");
            setSelectedRegionId(null);
          }}
          className="btn-primary px-8 py-3"
        >
          Host Another Server
        </button>
      </div>
    );
  }

  if (step === "billing") {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <button onClick={() => setStep("interior")} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6">
          ← Back to Interior
        </button>
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <DollarSign className="w-5 h-5 text-green-600" />
            <h2 className="font-semibold text-slate-900">Billing Summary</h2>
          </div>
          <div className="space-y-3 mb-5">
            {[
              ["Data Center", selectedDC?.name],
              ["Region", selectedRegion.replace("_", " ")],
              ["Server Name", serverName || "My Server"],
              ["Slot Count", deployableSlots.length.toString()],
              ["Rate", `$${SLOT_PRICE}/slot/month`],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-slate-500">{label}</span>
                <span className="font-medium text-slate-800 capitalize">{value as string}</span>
              </div>
            ))}
            <div className="border-t border-slate-100 pt-3">
              <label className="section-header block mb-2">Duration (months)</label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 3, 6, 12].map((m) => (
                  <button key={m} onClick={() => setDuration(m)}
                    className={`py-2 rounded-xl border text-sm font-medium transition-all ${
                      duration === m ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"
                    }`}>
                    {m}mo
                    {m >= 6 && (
                      <div className="text-xs text-green-600">-{m >= 12 ? 20 : 10}%</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-between text-base font-bold border-t border-slate-200 pt-3">
              <span>Total Cost</span>
              <span className="text-green-600">${totalCost.toFixed(2)}</span>
            </div>
            <div className="text-xs text-slate-400 text-right">
              {discount > 0 && `${(discount * 100).toFixed(0)}% discount applied`}
            </div>
          </div>

          <div>
            <label className="section-header block mb-2">Server Name</label>
            <input
              className="input-light mb-3"
              placeholder="My-Prod-Server"
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
            />
            <label className="section-header block mb-2">Card Number (Mock)</label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input className="input-light !pl-10" placeholder="4242 4242 4242 4242" />
            </div>
          </div>

          <button onClick={handlePayment} disabled={paying}
            className="btn-primary w-full mt-5 py-3 flex items-center justify-center gap-2">
            {paying ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              `Pay $${totalCost.toFixed(2)} & Deploy`
            )}
          </button>
        </div>
      </div>
    );
  }

  if (step === "interior") {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setStep("dc")} className="text-sm text-slate-500 hover:text-slate-700">
              ← Back
            </button>
            <div>
              <p className="font-semibold text-slate-900 text-sm">{selectedDC?.name}</p>
              <p className="text-xs text-slate-400">{availableSlots} slots available — click a green slot to select</p>
            </div>
          </div>
          {deployableSlots.length > 0 && (
            <button onClick={() => setStep("billing")}
              className="btn-primary flex items-center gap-2 px-5 py-2">
              Deploy {deployableSlots.length} Slot{deployableSlots.length > 1 ? 's' : ''} <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex-1 relative">
          <DataCenterInterior />
        </div>
      </div>
    );
  }

  const handleTerminateServer = () => {
    if (!terminatingSlotId) return;
    if (deletePassword !== "demo") { // Assume demo password is "demo"
      addNotification({ type: "error", title: "Authentication Failed", message: "Incorrect password. Termination aborted." });
      return;
    }
    updateSlotStatus(terminatingSlotId, "available", null, null, null);
    addNotification({ type: "success", title: "Server Terminated", message: "Your server instance has been shut down and billing stopped." });
    setTerminatingSlotId(null);
    setDeletePassword("");
  };

  const handleViewServer = (slot: any) => {
    // Navigate to the specific DC and highlight the slot
    setSelectedRegion(slot.region);
    setSelectedRegionId(slot.region);
    setSelectedDCId(slot.dcId);
    setSelectedDataCenterId(slot.dcId);
    clearSelectedSlots();
    useAppStore.getState().toggleSelectedSlotId(slot.id);
    setStep("interior");
  };

  if (step === "dc") {
    return (
      <div className="relative w-full h-full overflow-hidden bg-[#050814]">
        {/* Fullscreen Globe */}
        <div className="absolute inset-0 z-0">
          <GlobeView onDataCenterClick={(dcId) => handleSelectDC(dcId)} />
        </div>

        {/* Floating Overlays */}
        <div className="absolute inset-0 z-10 pointer-events-none flex p-6">
          <div className="w-[400px] h-full flex flex-col pointer-events-auto">
            <button onClick={() => { setStep("region"); setSelectedRegionId(null); }} className="mb-4 self-start bg-white/10 hover:bg-white/20 text-white backdrop-blur-md px-4 py-2 rounded-lg text-sm transition-all border border-white/10 flex items-center gap-2">
              ← Back to Regions
            </button>
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/50 flex flex-col flex-1 overflow-hidden animate-in slide-in-from-left-8 duration-300">
              <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/80">
                <h3 className="font-bold text-slate-900">Data Centers in {REGIONS.find((r) => r.id === selectedRegion)?.name}</h3>
                <p className="text-xs text-slate-500">{regionDCs.length} available facilities</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
                {regionDCs.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">No available data centers in this region.</div>
                ) : (
                  regionDCs.map((dc) => {
                    const avail = dc.rooms
                      .flatMap((r) => r.racks.flatMap((rack) => rack.slots))
                      .filter((s) => s.status === "available").length;
                    return (
                      <div key={dc.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-3">
                          <p className="font-semibold text-slate-900">{dc.name}</p>
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${ dc.status === "healthy" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700" }`}>{dc.status}</span>
                        </div>
                        <p className="text-xs text-slate-500 mb-4">{dc.location}</p>
                        <div className="flex justify-between text-xs text-slate-600 mb-4 bg-slate-50 p-2 rounded-lg">
                          <span>Available slots</span>
                          <span className="font-bold text-green-600">{avail}</span>
                        </div>
                        <button
                          onClick={() => handleSelectDC(dc.id)}
                          disabled={avail === 0 || dc.status === "offline"}
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Server className="w-4 h-4" /> View Interior
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step: region (Default)
  return (
    <div className="relative w-full h-full overflow-hidden bg-[#050814]">
      {/* Fullscreen Globe Background */}
      <div className="absolute inset-0 z-0">
        <GlobeView onDataCenterClick={() => {}} />
      </div>

      <div className="absolute inset-0 z-10 flex flex-col h-full bg-slate-50/40 backdrop-blur-sm overflow-hidden pointer-events-none">
        <div className="px-6 py-4 bg-white/90 backdrop-blur-md border-b border-slate-200/50 flex gap-4 pointer-events-auto">
          <button onClick={() => setActiveTab("host")} className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${activeTab === "host" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>Host New Server</button>
          <button onClick={() => setActiveTab("manage")} className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${activeTab === "manage" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>Manage My Servers ({userSlots.length})</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 pointer-events-none">
          {activeTab === "host" ? (
            <div className="max-w-4xl mx-auto pointer-events-auto">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Choose a Region</h2>
                <p className="text-slate-700 font-medium">Select a region to view available data centers on the interactive globe.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {REGIONS.map((region) => {
                  const dcsInRegion = dataCenters.filter((d) => d.region === region.id && !d.is_isolated);
                  const totalAvail = dcsInRegion.reduce((sum, dc) => sum + dc.rooms.flatMap((r) => r.racks.flatMap((rack) => rack.slots)).filter((s) => s.status === "available").length, 0);
                  return (
                    <button key={region.id} onClick={() => { setSelectedRegion(region.id); setSelectedRegionId(region.id); setStep("dc"); }} className="bg-white/95 backdrop-blur-md rounded-2xl p-6 text-left border border-white/20 shadow-lg hover:shadow-xl hover:border-blue-300 hover:-translate-y-1 transition-all group">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-600 transition-colors">
                        <MapPin className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
                      </div>
                      <p className="text-lg font-bold text-slate-900 mb-1">{region.name}</p>
                      <p className="text-sm text-slate-500 mb-3">{dcsInRegion.length} data centers</p>
                    <div className="inline-block px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold">
                      {totalAvail} slots available
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-4 pointer-events-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 drop-shadow-md">Active Servers</h2>
            {userSlots.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 border-dashed">
                <Cpu className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">You don't have any active servers yet.</p>
                <button onClick={() => setActiveTab("host")} className="mt-4 text-blue-600 font-medium hover:underline">Host one now</button>
              </div>
            ) : (
              userSlots.map((slot) => (
                <div key={slot.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${slot.health === "healthy" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                      <Server className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">{slot.server_name}</h3>
                      <p className="text-sm text-slate-500 flex items-center gap-2">
                        <span>{slot.dcName}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="capitalize">{slot.region.replace("_", " ")}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Status</p>
                      <p className={`font-medium ${slot.health === "healthy" ? "text-green-600" : "text-red-600"}`}>{slot.health}</p>
                    </div>
                    <button onClick={() => handleViewServer(slot)} className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium rounded-xl transition-colors border border-transparent hover:border-blue-200 text-sm">
                      View in 3D
                    </button>
                    <button onClick={() => setTerminatingSlotId(slot.id)} className="p-3 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-xl transition-colors border border-transparent hover:border-red-100" title="Terminate Server">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
            
            {/* Termination Modal */}
            {terminatingSlotId && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="bg-white p-6 rounded-2xl max-w-sm w-full shadow-2xl">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Confirm Deletion</h3>
                  <p className="text-sm text-slate-500 mb-4">This action cannot be undone. All data on this server will be lost.</p>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Enter your password</label>
                  <input
                    type="password"
                    placeholder="Enter 'demo' to confirm"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg mb-6"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                  />
                  <div className="flex justify-end gap-3">
                    <button onClick={() => { setTerminatingSlotId(null); setDeletePassword(""); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Cancel</button>
                    <button onClick={handleTerminateServer} disabled={!deletePassword} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50">Terminate</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}

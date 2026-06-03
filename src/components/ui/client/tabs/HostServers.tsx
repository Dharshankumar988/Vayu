"use client";

import { useState, useMemo } from "react";
import { useDCStore } from "@/store/dcStore";
import { useAppStore } from "@/store";
import { useUIStore } from "@/store/uiStore";
import { MapPin, Server, DollarSign, CreditCard, CheckCircle, ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";

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
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [serverName, setServerName] = useState("");
  const [duration, setDuration] = useState(1);
  const [paying, setPaying] = useState(false);

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

  const SLOT_PRICE = 120; // $120/slot/month
  const discount = duration >= 12 ? 0.2 : duration >= 6 ? 0.1 : 0;
  const totalCost = SLOT_PRICE * duration * (1 - discount);

  const handleSelectDC = (dcId: string) => {
    setSelectedDCId(dcId);
    setSelectedDataCenterId(dcId);
    setStep("interior");
  };

  const handlePayment = async () => {
    setPaying(true);
    await new Promise((r) => setTimeout(r, 2000));
    // Update slot status in store
    if (selectedSlotId) {
      updateSlotStatus(selectedSlotId, "occupied", user?.id, user?.full_name, serverName || "My Server");
    }
    addNotification({
      type: "success",
      title: "Server Hosted!",
      message: `${serverName || "Your server"} is now live in ${selectedDC?.name}.`,
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
            setSelectedSlotId("");
            setSelectedDCId("");
            setSelectedRegion("");
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
              ["Slot Count", "1"],
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
          {selectedSlotId && (
            <button onClick={() => setStep("billing")}
              className="btn-primary flex items-center gap-2 px-5 py-2">
              Continue to Billing <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex-1 relative">
          <DataCenterInterior />
        </div>
      </div>
    );
  }

  if (step === "dc") {
    return (
      <div className="p-6 max-w-3xl">
        <button onClick={() => setStep("region")} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6">
          ← Back to Regions
        </button>
        <h2 className="font-semibold text-slate-900 mb-4">
          Data Centers in {REGIONS.find((r) => r.id === selectedRegion)?.name}
        </h2>
        {regionDCs.length === 0 ? (
          <div className="card p-8 text-center text-slate-400">No available data centers in this region.</div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {regionDCs.map((dc) => {
              const avail = dc.rooms
                .flatMap((r) => r.racks.flatMap((rack) => rack.slots))
                .filter((s) => s.status === "available").length;
              return (
                <div key={dc.id} className="card p-5 hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <p className="font-semibold text-slate-900">{dc.name}</p>
                    <span className={`badge ${ dc.status === "healthy" ? "badge-healthy" : "badge-warning" }`}>{dc.status}</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">{dc.location}</p>
                  <div className="flex justify-between text-xs text-slate-600 mb-4">
                    <span>Available slots</span>
                    <span className="font-bold text-green-600">{avail}</span>
                  </div>
                  <button
                    onClick={() => handleSelectDC(dc.id)}
                    disabled={avail === 0 || dc.status === "offline"}
                    className="btn-primary w-full py-2 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Server className="w-4 h-4" /> View Interior
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Step: region
  return (
    <div className="p-6 max-w-3xl">
      <h2 className="font-semibold text-slate-900 mb-1">Choose a Region</h2>
      <p className="text-sm text-slate-400 mb-6">Select a region to view available data centers</p>
      <div className="grid grid-cols-3 gap-4">
        {REGIONS.map((region) => {
          const dcsInRegion = dataCenters.filter((d) => d.region === region.id && !d.is_isolated);
          const totalAvail = dcsInRegion.reduce((sum, dc) =>
            sum + dc.rooms
              .flatMap((r) => r.racks.flatMap((rack) => rack.slots))
              .filter((s) => s.status === "available").length,
            0
          );
          return (
            <button
              key={region.id}
              onClick={() => { setSelectedRegion(region.id); setStep("dc"); }}
              className="card p-5 text-left hover:shadow-md hover:border-blue-300 transition-all"
            >
              <MapPin className="w-6 h-6 text-blue-500 mb-3" />
              <p className="font-semibold text-slate-900 mb-1">{region.name}</p>
              <p className="text-xs text-slate-400">{dcsInRegion.length} data centers</p>
              <p className="text-xs text-green-600 font-medium mt-1">{totalAvail} slots available</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Bell, X, BellOff } from "lucide-react";
import { useUIStore } from "@/store/uiStore";

const GlobeView = dynamic(() => import("@/components/3d/Layer1/GlobeView"), { ssr: false });

export default function NotificationBar() {
  const { notifications, markRead, markAllRead, clearNotification } = useUIStore();
  const unreadCount = notifications.filter((n) => !n.read).length;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const colorMap = {
    info:     { bg: "#dbeafe", text: "#1d4ed8", dot: "#3b82f6" },
    success:  { bg: "#dcfce7", text: "#15803d", dot: "#22c55e" },
    warning:  { bg: "#fef3c7", text: "#b45309", dot: "#f59e0b" },
    critical: { bg: "#fee2e2", text: "#b91c1c", dot: "#ef4444" },
  };

  return (
    <div className="relative" ref={ref}>
      <button
        id="notif-bell"
        onClick={() => {
          setOpen(!open);
          if (!open && unreadCount > 0) markAllRead();
        }}
        className="relative w-10 h-10 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-colors"
      >
        <Bell className="w-5 h-5 text-slate-500" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-slide-in-up">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900 text-sm">Notifications</h3>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <button onClick={markAllRead} className="text-xs text-blue-600 hover:text-blue-700">
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                <BellOff className="w-6 h-6 opacity-40" />
                No notifications
              </div>
            ) : (
              notifications.slice(0, 20).map((notif) => {
                const colors = colorMap[notif.type];
                return (
                  <div
                    key={notif.id}
                    className={`px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${!notif.read ? "bg-blue-50/30" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                        style={{ background: colors.dot }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{notif.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {notif.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                      <button
                        onClick={() => clearNotification(notif.id)}
                        className="text-slate-300 hover:text-slate-500 flex-shrink-0 mt-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

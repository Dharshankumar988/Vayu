import { create } from 'zustand';

export type NotifType = 'info' | 'warning' | 'critical' | 'success';

export interface Notification {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface UIState {
  notifications: Notification[];
  addNotification: (n: { type: NotifType; title: string; message: string }) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearNotification: (id: string) => void;

  showGlobeLegend: boolean;
  toggleGlobeLegend: () => void;

  globeAltitude: number;
  setGlobeAltitude: (alt: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  notifications: [
    {
      id: 'init-1',
      type: 'success',
      title: 'Vayu Online',
      message: 'All systems operational. AI monitoring active.',
      timestamp: new Date(),
      read: false,
    },
  ],

  addNotification: (n) =>
    set((state) => ({
      notifications: [
        {
          id: crypto.randomUUID(),
          ...n,
          timestamp: new Date(),
          read: false,
        },
        ...state.notifications.slice(0, 49), // keep last 50
      ],
    })),

  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),

  clearNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  showGlobeLegend: false,
  toggleGlobeLegend: () =>
    set((state) => ({ showGlobeLegend: !state.showGlobeLegend })),

  globeAltitude: 2.2,
  setGlobeAltitude: (alt) => set({ globeAltitude: alt }),
}));

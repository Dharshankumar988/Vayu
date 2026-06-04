import { create } from 'zustand';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'public-anon-key'
);

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
  clearAllNotifications: () => void;

  showGlobeLegend: boolean;
  toggleGlobeLegend: () => void;

  globeAltitude: number;
  setGlobeAltitude: (alt: number) => void;

  loadNotifications: (userId: string) => Promise<void>;
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

  addNotification: async (n) => {
    const id = crypto.randomUUID();
    set((state) => ({
      notifications: [
        {
          id,
          ...n,
          timestamp: new Date(),
          read: false,
        },
        ...state.notifications.slice(0, 49),
      ],
    }));
    
    // Attempt to persist if there is a logged in user 
    // In a real app we'd get userId from session. We can do a fire-and-forget.
  },

  markRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  },

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),

  clearNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearAllNotifications: () =>
    set({ notifications: [] }),

  loadNotifications: async (userId) => {
      // In a more complete implementation, this would fetch from Supabase `notifications` table.
      // For this step, we just provide the signature and a dummy fetch if needed.
  },

  showGlobeLegend: true,
  toggleGlobeLegend: () =>
    set((state) => ({ showGlobeLegend: !state.showGlobeLegend })),

  globeAltitude: 2.2,
  setGlobeAltitude: (alt) => set({ globeAltitude: alt }),
}));

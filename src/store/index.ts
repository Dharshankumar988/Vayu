import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'admin' | 'client';
export type ClientType = 'individual' | 'organization';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type ViewMode = 'auth' | 'admin-dashboard' | 'client-dashboard' | 'dc-interior';
export type DcRegion = 'north_america' | 'south_america' | 'europe' | 'asia' | 'africa' | 'oceania';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  client_type: ClientType | null;
  full_name: string;
  company_name: string | null;
  country: string | null;
  region: string | null;
  phone: string | null;
  preferred_dc_region: DcRegion | null;
  approval_status: ApprovalStatus;
}

// 0=Globe (admin) or Host(client), 1=Approval/Reports, 2=OpLogs/Logs, 3=Regional, 4=Simulation
export type AdminTab = 0 | 1 | 2 | 3 | 4;
export type ClientTab = 0 | 1 | 2;

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;

  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // View Layer: 0 = globe, 1 = DC interior
  viewLayer: number;
  setViewLayer: (layer: number) => void;

  // Admin tabs (0-4)
  activeAdminTab: AdminTab;
  setActiveAdminTab: (tab: AdminTab) => void;

  // Client tabs (0-2)
  activeClientTab: ClientTab;
  setActiveClientTab: (tab: ClientTab) => void;

  // Selected IDs for drill-down
  selectedRegionId: string | null;
  setSelectedRegionId: (id: string | null) => void;

  selectedDataCenterId: string | null;
  setSelectedDataCenterId: (id: string | null) => void;

  selectedRoomId: string | null;
  setSelectedRoomId: (id: string | null) => void;

  selectedRackId: string | null;
  setSelectedRackId: (id: string | null) => void;

  selectedSlotIds: string[];
  toggleSelectedSlotId: (id: string) => void;
  clearSelectedSlots: () => void;

  revalidateUser: () => Promise<void>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) =>
        set({
          user,
          viewMode: !user
            ? 'auth'
            : user.role === 'admin'
            ? 'admin-dashboard'
            : 'client-dashboard',
        }),

      revalidateUser: async () => {
        const currentUser = get().user;
        if (!currentUser) return;
        
        try {
          const res = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'list_all' })
          });
          const data = await res.json();
          // Find if user is still there and approved. If not, log them out.
          // In a real app we'd fetch just this user, but list_all works for our demo size.
          // Note: admin users are not returned by list_all in the current auth implementation,
          // so we should only invalidate if they are found and suspended/rejected.
          if (data.data) {
             const serverUser = data.data.find((u: any) => u.id === currentUser.id);
             if (serverUser && serverUser.approval_status !== 'approved') {
                 get().setUser(null);
             }
          }
        } catch (e) {
          console.error("Failed to revalidate user", e);
        }
      },

      viewMode: 'auth',
      setViewMode: (mode) => set({ viewMode: mode }),

      viewLayer: 0,
      setViewLayer: (layer) => set({ viewLayer: layer }),

      activeAdminTab: 0,
      setActiveAdminTab: (tab) => set({ activeAdminTab: tab }),

      activeClientTab: 0,
      setActiveClientTab: (tab) => set({ activeClientTab: tab }),

      selectedRegionId: null,
      setSelectedRegionId: (id) => set({ selectedRegionId: id }),

      selectedDataCenterId: null,
      setSelectedDataCenterId: (id) => set({ selectedDataCenterId: id }),

      selectedRoomId: null,
      setSelectedRoomId: (id) => set({ selectedRoomId: id }),

      selectedRackId: null,
      setSelectedRackId: (id) => set({ selectedRackId: id }),

      selectedSlotIds: [],
      toggleSelectedSlotId: (id) => set((state) => {
        const exists = state.selectedSlotIds.includes(id);
        if (exists) {
          return { selectedSlotIds: state.selectedSlotIds.filter(s => s !== id) };
        } else {
          return { selectedSlotIds: [...state.selectedSlotIds, id] };
        }
      }),
      clearSelectedSlots: () => set({ selectedSlotIds: [] }),
    }),
    {
      name: 'vayu-app-store',
    }
  )
);

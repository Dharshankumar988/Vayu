import { create } from 'zustand';

export type UserRole = 'admin' | 'client' | 'provider';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  company_name: string;
  full_name: string;
}

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  
  // View State (0 = Global, 1 = Regional, 2 = Data Center Interior)
  viewLayer: number;
  setViewLayer: (layer: number) => void;
  
  // Selected Data Center for Zooming In
  selectedDataCenterId: string | null;
  setSelectedDataCenterId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  
  viewLayer: 0,
  setViewLayer: (layer) => set({ viewLayer: layer }),
  
  selectedDataCenterId: null,
  setSelectedDataCenterId: (id) => set({ selectedDataCenterId: id }),
}));

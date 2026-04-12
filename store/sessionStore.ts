/**
 * SunTrace - Active Session Store
 *
 * Zustand store for managing in-progress sun exposure session state.
 * This is the single source of truth for the active session across tabs.
 * The banner, session tab, and home tab all read from this store.
 */
import { create } from 'zustand';

// ============================================
// Types
// ============================================

export interface ActiveSession {
  id: string | null;
  startTime: Date | null;
  currentUV: number;
  dEarned: number; // IU accumulated
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  isActive: boolean;
}

interface SessionStore {
  session: ActiveSession;
  startSession: (
    id: string,
    uv: number,
    lat?: number,
    lng?: number,
    locationName?: string
  ) => void;
  updateUV: (uv: number) => void;
  updateDEarned: (iu: number) => void;
  stopSession: () => ActiveSession;
  reset: () => void;
}

// ============================================
// Initial state
// ============================================

const initialSession: ActiveSession = {
  id: null,
  startTime: null,
  currentUV: 0,
  dEarned: 0,
  latitude: null,
  longitude: null,
  locationName: null,
  isActive: false,
};

// ============================================
// Store
// ============================================

export const useSessionStore = create<SessionStore>((set, get) => ({
  session: initialSession,

  startSession: (id, uv, lat, lng, locationName) => {
    set({
      session: {
        id,
        startTime: new Date(),
        currentUV: uv,
        dEarned: 0,
        latitude: lat ?? null,
        longitude: lng ?? null,
        locationName: locationName ?? null,
        isActive: true,
      },
    });
  },

  updateUV: (uv) => {
    set((state) => ({
      session: { ...state.session, currentUV: uv },
    }));
  },

  updateDEarned: (iu) => {
    set((state) => ({
      session: { ...state.session, dEarned: iu },
    }));
  },

  stopSession: () => {
    const snapshot = { ...get().session };
    set({ session: initialSession });
    return snapshot;
  },

  reset: () => {
    set({ session: initialSession });
  },
}));

export default useSessionStore;

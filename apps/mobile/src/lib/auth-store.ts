import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { UserDTO } from "@ga-app/shared-types";

interface AuthState {
  token: string | null;
  user: UserDTO | null;
  isSuperAdmin: boolean;
  hasHydrated: boolean;
  setSession: (token: string, user: UserDTO) => void;
  logout: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isSuperAdmin: false,
      hasHydrated: false,
      setSession: (token, user) => set({ token, user, isSuperAdmin: user.role === "SUPER_ADMIN" }),
      logout: () => set({ token: null, user: null, isSuperAdmin: false }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "ga-auth",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ token: state.token, user: state.user, isSuperAdmin: state.isSuperAdmin }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    }
  )
);

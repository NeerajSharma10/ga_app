import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ToneId = "chime" | "bell" | "beep";

export const TONES: { id: ToneId; label: string }[] = [
  { id: "chime", label: "Chime" },
  { id: "bell", label: "Bell" },
  { id: "beep", label: "Beep" },
];

interface NotificationState {
  tone: ToneId;
  setTone: (tone: ToneId) => void;
}

// A pleasant two-note chime is the default - noticeable without being
// jarring on a busy floor.
export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      tone: "chime",
      setTone: (tone) => set({ tone }),
    }),
    {
      name: "ga-notification-prefs",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

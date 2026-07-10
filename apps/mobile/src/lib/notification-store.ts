import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ToneId = "chime" | "bell" | "beep" | "custom";

export const BUILT_IN_TONES: { id: Exclude<ToneId, "custom">; label: string }[] = [
  { id: "chime", label: "Chime" },
  { id: "bell", label: "Bell" },
  { id: "beep", label: "Beep" },
];

interface NotificationState {
  tone: ToneId;
  customToneUri: string | null;
  customToneName: string | null;
  setTone: (tone: ToneId) => void;
  setCustomTone: (uri: string, name: string) => void;
}

// A pleasant two-note chime is the default - noticeable without being
// jarring on a busy floor.
export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      tone: "chime",
      customToneUri: null,
      customToneName: null,
      setTone: (tone) => set({ tone }),
      setCustomTone: (uri, name) => set({ customToneUri: uri, customToneName: name, tone: "custom" }),
    }),
    {
      name: "ga-notification-prefs",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

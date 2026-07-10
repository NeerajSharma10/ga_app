import { createAudioPlayer } from "expo-audio";
import type { ToneId } from "./notification-store";

const SOUND_FILES: Record<ToneId, number> = {
  chime: require("../../assets/sounds/chime.wav"),
  bell: require("../../assets/sounds/bell.wav"),
  beep: require("../../assets/sounds/beep.wav"),
};

export function playTone(tone: ToneId) {
  try {
    const player = createAudioPlayer(SOUND_FILES[tone]);
    const subscription = player.addListener("playbackStatusUpdate", (status) => {
      if (status.didJustFinish) {
        subscription.remove();
        player.remove();
      }
    });
    player.play();
  } catch {
    // Audio can fail to play in some environments (e.g. browser autoplay
    // restrictions before any user interaction) - a missed alert sound
    // isn't worth crashing the screen over.
  }
}

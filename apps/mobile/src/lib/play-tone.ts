import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import type { ToneId } from "./notification-store";

const BUILT_IN_SOUNDS: Record<Exclude<ToneId, "custom">, number> = {
  chime: require("../../assets/sounds/chime.wav"),
  bell: require("../../assets/sounds/bell.wav"),
  beep: require("../../assets/sounds/beep.wav"),
};

function resolveSource(tone: ToneId, customUri: string | null): number | string {
  if (tone === "custom") return customUri ?? BUILT_IN_SOUNDS.chime;
  return BUILT_IN_SOUNDS[tone];
}

// Plays once, for the "Test" button - lets staff preview a tone without it
// looping forever.
export function playTonePreview(tone: ToneId, customUri: string | null) {
  try {
    const player = createAudioPlayer(resolveSource(tone, customUri));
    const subscription = player.addListener("playbackStatusUpdate", (status) => {
      if (status.didJustFinish) {
        subscription.remove();
        player.remove();
      }
    });
    player.play();
  } catch {
    // Audio can fail in some environments (e.g. browser autoplay
    // restrictions before any user interaction) - not worth crashing over.
  }
}

// A session whose booked time is up rings on a loop until staff explicitly
// stops it (or ends the session) - a single short chime is too easy to miss
// on a busy floor.
const ringingPlayers = new Map<number, AudioPlayer>();

export function startRinging(sessionId: number, tone: ToneId, customUri: string | null) {
  if (ringingPlayers.has(sessionId)) return;
  try {
    const player = createAudioPlayer(resolveSource(tone, customUri));
    player.loop = true;
    player.play();
    ringingPlayers.set(sessionId, player);
  } catch {
    // See note above.
  }
}

export function stopRinging(sessionId: number) {
  const player = ringingPlayers.get(sessionId);
  if (!player) return;
  try {
    player.loop = false;
    player.remove();
  } catch {
    // Already gone - fine.
  }
  ringingPlayers.delete(sessionId);
}

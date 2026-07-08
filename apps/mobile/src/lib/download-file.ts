import { Platform } from "react-native";
import { API_BASE_URL } from "./api";
import { useAuthStore } from "./auth-store";

// Downloads a file from the API and hands it to the OS/browser to save or
// share. expo-file-system/expo-sharing are native-only, so web gets its own
// blob-download path.
export async function downloadFile(path: string, filename: string, mimeType: string) {
  const token = useAuthStore.getState().token;
  const url = `${API_BASE_URL}${path}`;
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  if (Platform.OS === "web") {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error("Could not download file");
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(blobUrl);
    return;
  }

  const [FileSystem, Sharing] = await Promise.all([import("expo-file-system/legacy"), import("expo-sharing")]);
  const fileUri = `${FileSystem.documentDirectory}${filename}`;
  const { uri } = await FileSystem.downloadAsync(url, fileUri, { headers });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType });
  }
}

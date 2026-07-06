import { Platform } from "react-native";
import { API_BASE_URL } from "./api";
import { useAuthStore } from "./auth-store";

export async function downloadAndShareReceipt(sessionId: number) {
  const token = useAuthStore.getState().token;
  const url = `${API_BASE_URL}/sessions/${sessionId}/receipt.pdf`;
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  if (Platform.OS === "web") {
    // expo-file-system/expo-sharing are native-only - on web, fetch the PDF
    // as a blob and trigger a normal browser download instead.
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error("Could not download receipt");
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `receipt-${sessionId}.pdf`;
    link.click();
    URL.revokeObjectURL(blobUrl);
    return;
  }

  const [FileSystem, Sharing] = await Promise.all([import("expo-file-system/legacy"), import("expo-sharing")]);
  const fileUri = `${FileSystem.documentDirectory}receipt-${sessionId}.pdf`;
  const { uri } = await FileSystem.downloadAsync(url, fileUri, { headers });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "application/pdf" });
  }
}

import { Platform } from "react-native";

// Document picker gives back a URI that's only valid transiently (a blob:
// URL on web, a cache path on native) - copy it somewhere stable so it
// still works after the app restarts.
export async function persistCustomTone(pickedUri: string, fileName: string): Promise<string> {
  if (Platform.OS === "web") {
    const res = await fetch(pickedUri);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Could not read the selected file"));
      reader.readAsDataURL(blob);
    });
  }

  const FileSystem = await import("expo-file-system/legacy");
  const extension = fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".")) : "";
  // A fresh filename each time (rather than a query-string cache-bust on a
  // file:// URI, which native audio players don't reliably parse) so
  // picking a new custom tone never risks playing a stale cached file.
  const dest = `${FileSystem.documentDirectory}custom-tone-${Date.now()}${extension}`;
  await FileSystem.copyAsync({ from: pickedUri, to: dest });
  return dest;
}

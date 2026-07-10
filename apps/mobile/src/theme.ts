// Matches Gamer's Academy branding: dark arcade background, blue/red neon accents.
export const colors = {
  bg: "#0A0D16",
  panel: "#12161F",
  panelAlt: "#171C29",
  border: "#232B42",
  text: "#E8EBF7",
  textDim: "#8890B0",
  accent: "#3E7BFF",
  accent2: "#FF3D6E",
  available: "#34D399",
  inUse: "#FBBF24",
  maintenance: "#F87171",
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 8, md: 10, lg: 14 };

// Cross-platform elevation - shadow* is read on iOS/web, elevation on Android.
export const shadow = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.28,
  shadowRadius: 10,
  elevation: 4,
};

export const typography = {
  h1: { fontSize: 26, fontWeight: "700" as const },
  h2: { fontSize: 19, fontWeight: "700" as const },
  body: { fontSize: 15, fontWeight: "400" as const },
  caption: { fontSize: 12, fontWeight: "500" as const },
};

export function statusColor(status: "AVAILABLE" | "IN_USE" | "MAINTENANCE") {
  if (status === "AVAILABLE") return colors.available;
  if (status === "IN_USE") return colors.inUse;
  return colors.maintenance;
}

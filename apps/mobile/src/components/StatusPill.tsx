import { View, Text, StyleSheet } from "react-native";
import { statusColor } from "../theme";

const LABELS: Record<string, string> = {
  AVAILABLE: "Available",
  IN_USE: "In use",
  MAINTENANCE: "Maintenance",
};

export function StatusPill({ status }: { status: "AVAILABLE" | "IN_USE" | "MAINTENANCE" }) {
  const color = statusColor(status);
  return (
    <View style={[styles.pill, { borderColor: color, backgroundColor: `${color}22` }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 11, fontWeight: "700" },
});

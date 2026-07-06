import { useState } from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { SessionDTO } from "@ga-app/shared-types";
import { api, ApiError } from "../lib/api";
import { downloadAndShareReceipt } from "../lib/download-receipt";
import { colors, radius, spacing, typography } from "../theme";
import { Card } from "../components/Card";
import { Button } from "../components/Button";

export function SessionHistoryScreen() {
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [errorById, setErrorById] = useState<Record<number, string>>({});
  const { data: sessions } = useQuery({
    queryKey: ["sessions", "history"],
    queryFn: () => api.get<SessionDTO[]>("/sessions"),
  });

  // Still-running sessions belong to the Active tab, not history - and their
  // baseAmount alone (with no addons/discounts applied yet) isn't a
  // meaningful "amount" to show here.
  const completed = sessions?.filter((s) => s.endTime);

  async function handleReceipt(session: SessionDTO) {
    setErrorById((prev) => ({ ...prev, [session.id]: "" }));
    setDownloadingId(session.id);
    try {
      await downloadAndShareReceipt(session.id);
    } catch (err) {
      setErrorById((prev) => ({
        ...prev,
        [session.id]: err instanceof ApiError ? err.message : "Could not get receipt",
      }));
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Session history</Text>
      <FlatList
        data={completed ?? []}
        keyExtractor={(s) => String(s.id)}
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xl }}
        ListEmptyComponent={<Text style={styles.empty}>No sessions yet.</Text>}
        renderItem={({ item }) => (
          <Card style={{ gap: spacing.xs, borderRadius: radius.lg }}>
            <View style={styles.card}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.stationLabel}>{item.station?.gameType?.name} · {item.station?.label}</Text>
                <Text style={styles.customerName}>{item.customer?.name}</Text>
                <Text style={styles.meta}>
                  {new Date(item.startTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </Text>
                <Text style={styles.amount}>
                  ₹{(item.totalAmount ?? item.baseAmount).toFixed(2)} · {item.paymentType ?? "pending"}
                </Text>
              </View>
              <Button title="Receipt" variant="secondary" onPress={() => handleReceipt(item)} loading={downloadingId === item.id} />
            </View>
            {errorById[item.id] ? <Text style={styles.error}>{errorById[item.id]}</Text> : null}
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.lg },
  empty: { color: colors.textDim, textAlign: "center", marginTop: spacing.xxl },
  card: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  stationLabel: { color: colors.accent, fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  customerName: { color: colors.text, fontSize: 15, fontWeight: "700" },
  meta: { color: colors.textDim, fontSize: 12 },
  amount: { color: colors.text, fontSize: 13, fontWeight: "600", marginTop: 2 },
  error: { color: colors.maintenance, fontSize: 12 },
});

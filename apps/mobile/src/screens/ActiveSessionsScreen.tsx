import { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SessionDTO } from "@ga-app/shared-types";
import { api, ApiError } from "../lib/api";
import { previewSessionPrice } from "../lib/pricing-preview";
import { colors, radius, spacing, typography } from "../theme";
import { Card } from "../components/Card";
import { Button } from "../components/Button";

// The session's own `baseAmount` field is just the base price - it doesn't
// include controller add-ons or discounts. Recompute the true amount due the
// same way the server will, so staff aren't shown a number that undercounts
// what's about to be charged.
function amountDue(session: SessionDTO): number {
  if (session.totalAmount != null) return session.totalAmount;
  if (!session.station?.gameType) return session.baseAmount;
  return previewSessionPrice({
    baseAmount: session.baseAmount,
    gameType: session.station.gameType,
    extraControllers: session.extraControllers,
    discountType: session.discountType ?? undefined,
    discountValue: session.discountValue ?? undefined,
    isMember: session.customer?.isMember,
    memberDiscountPercent: session.customer?.memberDiscountPercent,
  }).totalAmount;
}

export function ActiveSessionsScreen() {
  const queryClient = useQueryClient();
  const [now, setNow] = useState(Date.now());
  const [endingId, setEndingId] = useState<number | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [errorById, setErrorById] = useState<Record<number, string>>({});

  const { data: sessions, refetch } = useQuery({
    queryKey: ["sessions", "active"],
    queryFn: () => api.get<SessionDTO[]>("/sessions?active=true"),
    refetchInterval: 20_000,
  });

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  async function finishSession(session: SessionDTO, paymentType?: "CASH" | "ONLINE") {
    setEndingId(session.id);
    setErrorById((prev) => ({ ...prev, [session.id]: "" }));
    try {
      await api.put(`/sessions/${session.id}/end`, paymentType ? { paymentType } : {});
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["stations"] });
      setConfirmingId(null);
      refetch();
    } catch (err) {
      setErrorById((prev) => ({
        ...prev,
        [session.id]: err instanceof ApiError ? err.message : "Could not end session",
      }));
    } finally {
      setEndingId(null);
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Active sessions</Text>
      <FlatList
        data={sessions ?? []}
        keyExtractor={(s) => String(s.id)}
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xl }}
        ListEmptyComponent={<Text style={styles.empty}>No sessions running right now.</Text>}
        renderItem={({ item }) => {
          const elapsedMin = Math.floor((now - new Date(item.startTime).getTime()) / 60000);
          const elapsedSec = Math.floor(((now - new Date(item.startTime).getTime()) % 60000) / 1000);
          const isConfirming = confirmingId === item.id;
          const isPaid = item.paymentStatus === "PAID";
          return (
            <Card style={{ gap: spacing.sm, borderRadius: radius.lg }}>
              <View style={styles.card}>
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                    <Text style={styles.stationLabel}>{item.station?.gameType?.name} · {item.station?.label}</Text>
                    {isPaid ? <Text style={styles.paidBadge}>PAID</Text> : null}
                  </View>
                  <Text style={styles.customerName}>{item.customer?.name}</Text>
                  <Text style={styles.timer}>
                    {elapsedMin}m {elapsedSec.toString().padStart(2, "0")}s elapsed
                  </Text>
                </View>
                <Button title="End" variant="danger" onPress={() => setConfirmingId(item.id)} />
              </View>
              {isConfirming && isPaid ? (
                // Already paid upfront - ending just frees the station.
                <View style={{ gap: spacing.sm }}>
                  <Text style={styles.label}>Already paid (₹{amountDue(item).toFixed(2)}) — confirm the customer is leaving?</Text>
                  <View style={{ flexDirection: "row", gap: spacing.sm }}>
                    <Button title="Confirm" onPress={() => finishSession(item)} loading={endingId === item.id} style={{ flex: 1 }} />
                    <Button title="Cancel" variant="secondary" onPress={() => setConfirmingId(null)} />
                  </View>
                  {errorById[item.id] ? <Text style={styles.error}>{errorById[item.id]}</Text> : null}
                </View>
              ) : isConfirming ? (
                // Not paid yet - collect payment now as part of ending.
                <View style={{ gap: spacing.sm }}>
                  <Text style={styles.label}>Total: ₹{amountDue(item).toFixed(2)} — choose payment method</Text>
                  <View style={{ flexDirection: "row", gap: spacing.sm }}>
                    <Button
                      title="Cash"
                      onPress={() => finishSession(item, "CASH")}
                      loading={endingId === item.id}
                      style={{ flex: 1 }}
                    />
                    <Button
                      title="Online"
                      variant="secondary"
                      onPress={() => finishSession(item, "ONLINE")}
                      loading={endingId === item.id}
                      style={{ flex: 1 }}
                    />
                    <Button title="Cancel" variant="secondary" onPress={() => setConfirmingId(null)} />
                  </View>
                  {errorById[item.id] ? <Text style={styles.error}>{errorById[item.id]}</Text> : null}
                </View>
              ) : null}
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.lg },
  empty: { color: colors.textDim, textAlign: "center", marginTop: spacing.xxl },
  card: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  stationLabel: { color: colors.accent, fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  paidBadge: {
    color: colors.available,
    fontSize: 10,
    fontWeight: "800",
    borderWidth: 1,
    borderColor: colors.available,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  customerName: { color: colors.text, fontSize: 16, fontWeight: "700" },
  timer: { color: colors.textDim, fontSize: 13, fontVariant: ["tabular-nums"] },
  label: { color: colors.textDim, fontSize: 13 },
  error: { color: colors.maintenance, fontSize: 12 },
});

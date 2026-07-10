import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SessionDTO } from "@ga-app/shared-types";
import { api, ApiError } from "../lib/api";
import { previewSessionPrice } from "../lib/pricing-preview";
import { playTonePreview, startRinging, stopRinging } from "../lib/play-tone";
import { persistCustomTone } from "../lib/persist-custom-tone";
import { BUILT_IN_TONES, useNotificationStore } from "../lib/notification-store";
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
  const [toneError, setToneError] = useState("");
  const [pickingTone, setPickingTone] = useState(false);
  const tone = useNotificationStore((s) => s.tone);
  const setTone = useNotificationStore((s) => s.setTone);
  const customToneUri = useNotificationStore((s) => s.customToneUri);
  const customToneName = useNotificationStore((s) => s.customToneName);
  const setCustomTone = useNotificationStore((s) => s.setCustomTone);
  // Gates the one-time startRinging() call per session - doesn't need to
  // trigger re-renders, so a ref is fine.
  const startedRingingIds = useRef<Set<number>>(new Set());
  // Which time's-up sessions staff has silenced - drives the "Stop alert"
  // button's visibility, so it has to be real state to re-render on toggle.
  const [mutedIds, setMutedIds] = useState<Set<number>>(new Set());

  const { data: sessions, refetch } = useQuery({
    queryKey: ["sessions", "active"],
    queryFn: () => api.get<SessionDTO[]>("/sessions?active=true"),
    refetchInterval: 20_000,
  });

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Once a session's booked duration is up (coin games have no fixed
  // duration, so they never trigger this), it rings on a loop until staff
  // stops it or ends the session - a single chime is too easy to miss on a
  // busy floor.
  useEffect(() => {
    if (!sessions) return;
    const stillActiveIds = new Set(sessions.map((s) => s.id));
    let droppedAny = false;
    for (const id of startedRingingIds.current) {
      if (!stillActiveIds.has(id)) {
        stopRinging(id);
        startedRingingIds.current.delete(id);
        droppedAny = true;
      }
    }
    if (droppedAny) {
      setMutedIds((prev) => new Set([...prev].filter((id) => stillActiveIds.has(id))));
    }
    for (const session of sessions) {
      if (!session.durationMinutes || startedRingingIds.current.has(session.id)) continue;
      const elapsedMin = (now - new Date(session.startTime).getTime()) / 60000;
      if (elapsedMin >= session.durationMinutes) {
        startedRingingIds.current.add(session.id);
        startRinging(session.id, tone, customToneUri);
      }
    }
  }, [now, sessions, tone, customToneUri]);

  async function pickCustomTone() {
    setToneError("");
    setPickingTone(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "audio/*" });
      if (result.canceled || !result.assets?.[0]) return;
      const file = result.assets[0];
      const persistedUri = await persistCustomTone(file.uri, file.name);
      setCustomTone(persistedUri, file.name);
    } catch {
      setToneError("Could not use that file");
    } finally {
      setPickingTone(false);
    }
  }

  async function finishSession(session: SessionDTO, paymentType?: "CASH" | "ONLINE") {
    setEndingId(session.id);
    setErrorById((prev) => ({ ...prev, [session.id]: "" }));
    try {
      await api.put(`/sessions/${session.id}/end`, paymentType ? { paymentType } : {});
      stopRinging(session.id);
      startedRingingIds.current.delete(session.id);
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

      <View style={styles.toneSection}>
        <Text style={styles.toneLabel}>Alert tone</Text>
        <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
          {BUILT_IN_TONES.map((t) => (
            <Button key={t.id} title={t.label} variant={tone === t.id ? "primary" : "secondary"} onPress={() => setTone(t.id)} />
          ))}
          <Button
            title={customToneName ? `Custom: ${customToneName}` : "Custom…"}
            variant={tone === "custom" ? "primary" : "secondary"}
            onPress={() => (customToneUri ? setTone("custom") : pickCustomTone())}
            loading={pickingTone}
          />
          {customToneUri ? <Button title="Change" variant="secondary" onPress={pickCustomTone} loading={pickingTone} /> : null}
          <Button title="Test" variant="secondary" onPress={() => playTonePreview(tone, customToneUri)} />
        </View>
        {toneError ? <Text style={styles.error}>{toneError}</Text> : null}
      </View>

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
          const timeUp = !!item.durationMinutes && elapsedMin >= item.durationMinutes;
          const isRinging = timeUp && !mutedIds.has(item.id);
          return (
            <Card style={{ gap: spacing.sm, borderRadius: radius.lg, borderColor: timeUp ? colors.maintenance : colors.border }}>
              <View style={styles.card}>
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                    <Text style={styles.stationLabel}>{item.station?.gameType?.name} · {item.station?.label}</Text>
                    {isPaid ? <Text style={styles.paidBadge}>PAID</Text> : null}
                    {timeUp ? <Text style={styles.timeUpBadge}>TIME'S UP</Text> : null}
                  </View>
                  <Text style={styles.customerName}>{item.customer?.name}</Text>
                  <Text style={[styles.timer, timeUp ? { color: colors.maintenance } : null]}>
                    {elapsedMin}m {elapsedSec.toString().padStart(2, "0")}s elapsed
                    {item.durationMinutes ? ` / ${item.durationMinutes}m booked` : ""}
                  </Text>
                </View>
                {isRinging ? (
                  <Button
                    title="Stop alert"
                    variant="secondary"
                    onPress={() => {
                      stopRinging(item.id);
                      setMutedIds((prev) => new Set(prev).add(item.id));
                    }}
                  />
                ) : null}
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
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.md },
  toneSection: { gap: spacing.sm, marginBottom: spacing.lg },
  toneLabel: { color: colors.textDim, fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
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
  timeUpBadge: {
    color: colors.maintenance,
    fontSize: 10,
    fontWeight: "800",
    borderWidth: 1,
    borderColor: colors.maintenance,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  customerName: { color: colors.text, fontSize: 16, fontWeight: "700" },
  timer: { color: colors.textDim, fontSize: 13, fontVariant: ["tabular-nums"] },
  label: { color: colors.textDim, fontSize: 13 },
  error: { color: colors.maintenance, fontSize: 12 },
});

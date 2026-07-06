import { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { GameTypeDTO, StationDTO, StationStatus } from "@ga-app/shared-types";
import { api, ApiError } from "../lib/api";
import { colors, spacing, typography } from "../theme";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { StatusPill } from "../components/StatusPill";

export function ManageStationsScreen() {
  const queryClient = useQueryClient();
  const [newLabel, setNewLabel] = useState("");
  const [selectedGameTypeId, setSelectedGameTypeId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const { data: gameTypes } = useQuery({
    queryKey: ["game-types"],
    queryFn: () => api.get<GameTypeDTO[]>("/game-types"),
  });
  const { data: stations } = useQuery({
    queryKey: ["stations"],
    queryFn: () => api.get<StationDTO[]>("/stations"),
  });

  async function addStation() {
    setFormError("");
    if (!selectedGameTypeId) return setFormError("Pick a game type");
    if (!newLabel.trim()) return setFormError("Enter a station label");

    setSaving(true);
    try {
      await api.post("/stations", { label: newLabel, gameTypeId: selectedGameTypeId });
      setNewLabel("");
      queryClient.invalidateQueries({ queryKey: ["stations"] });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not add station");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(station: StationDTO, status: StationStatus) {
    await api.put(`/stations/${station.id}`, { status });
    queryClient.invalidateQueries({ queryKey: ["stations"] });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.xxl }}>
      <Text style={styles.title}>Stations & pricing</Text>

      <Card style={{ gap: spacing.md }}>
        <Text style={styles.sectionTitle}>Add station</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {gameTypes?.map((gt) => (
            <Button
              key={gt.id}
              title={gt.name}
              variant={selectedGameTypeId === gt.id ? "primary" : "secondary"}
              onPress={() => setSelectedGameTypeId(gt.id)}
            />
          ))}
        </View>
        <TextField label="Station label" value={newLabel} onChangeText={setNewLabel} placeholder="e.g. PS5 - Unit 2" />
        {formError ? <Text style={styles.error}>{formError}</Text> : null}
        <Button title="Add station" onPress={addStation} loading={saving} />
      </Card>

      <Card style={{ gap: spacing.md }}>
        <Text style={styles.sectionTitle}>Stations</Text>
        {stations?.map((s) => (
          <View key={s.id} style={styles.stationRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.stationLabel}>{s.gameType?.name} · {s.label}</Text>
              <StatusPill status={s.status} />
            </View>
            <Button
              title={s.status === "MAINTENANCE" ? "Mark available" : "Mark maintenance"}
              variant="secondary"
              onPress={() => setStatus(s, s.status === "MAINTENANCE" ? "AVAILABLE" : "MAINTENANCE")}
            />
          </View>
        ))}
      </Card>

      <Card style={{ gap: spacing.md }}>
        <Text style={styles.sectionTitle}>Pricing (by game type)</Text>
        {gameTypes?.map((gt) => (
          <View key={gt.id} style={{ gap: 4 }}>
            <Text style={styles.stationLabel}>{gt.name}</Text>
            {gt.priceTiers.length > 0 ? (
              <Text style={styles.priceLine}>
                {gt.priceTiers.map((t) => `${t.durationMinutes}min = ₹${t.price}`).join("  ·  ")}
              </Text>
            ) : null}
            {gt.coinPackages.length > 0 ? (
              <Text style={styles.priceLine}>
                {gt.coinPackages.map((c) => `${c.quantity} coins = ₹${c.price}`).join("  ·  ")}
              </Text>
            ) : null}
            {gt.extraControllerPrice ? (
              <Text style={styles.priceLine}>Extra controller: ₹{gt.extraControllerPrice}</Text>
            ) : null}
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl },
  title: { ...typography.h1, color: colors.text },
  sectionTitle: { color: colors.accent, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  stationRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  stationLabel: { color: colors.text, fontSize: 14, fontWeight: "700" },
  priceLine: { color: colors.textDim, fontSize: 12 },
  error: { color: colors.maintenance, fontSize: 13 },
});

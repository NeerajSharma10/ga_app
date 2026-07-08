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

      <Card style={{ gap: spacing.lg }}>
        <Text style={styles.sectionTitle}>Pricing (by game type)</Text>
        {gameTypes?.map((gt) => <GameTypePricingEditor key={gt.id} gameType={gt} />)}
      </Card>
    </ScrollView>
  );
}

interface TierField {
  durationMinutes: string;
  price: string;
}

interface PackageField {
  quantity: string;
  price: string;
}

function GameTypePricingEditor({ gameType }: { gameType: GameTypeDTO }) {
  const queryClient = useQueryClient();
  const [tiers, setTiers] = useState<TierField[]>(
    gameType.priceTiers.map((t) => ({ durationMinutes: String(t.durationMinutes), price: String(t.price) }))
  );
  const [packages, setPackages] = useState<PackageField[]>(
    gameType.coinPackages.map((c) => ({ quantity: String(c.quantity), price: String(c.price) }))
  );
  const [controllerPrice, setControllerPrice] = useState(
    gameType.extraControllerPrice != null ? String(gameType.extraControllerPrice) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateTier(index: number, field: keyof TierField, value: string) {
    setTiers((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  }
  function updatePackage(index: number, field: keyof PackageField, value: string) {
    setPackages((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  }

  async function save() {
    setError("");
    const parsedTiers = tiers
      .map((t) => ({ durationMinutes: Number(t.durationMinutes), price: Number(t.price) }))
      .filter((t) => t.durationMinutes > 0 && t.price >= 0);
    const parsedPackages = packages
      .map((p) => ({ quantity: Number(p.quantity), price: Number(p.price) }))
      .filter((p) => p.quantity > 0 && p.price >= 0);

    setSaving(true);
    try {
      await api.put(`/game-types/${gameType.id}`, {
        priceTiers: parsedTiers,
        coinPackages: parsedPackages,
        extraControllerPrice: controllerPrice ? Number(controllerPrice) : null,
      });
      queryClient.invalidateQueries({ queryKey: ["game-types"] });
      queryClient.invalidateQueries({ queryKey: ["stations"] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save pricing");
    } finally {
      setSaving(false);
    }
  }

  const showPackages = gameType.category === "COIN" || packages.length > 0;

  return (
    <View style={styles.editor}>
      <Text style={styles.stationLabel}>{gameType.name}</Text>

      {tiers.map((t, i) => (
        <View key={i} style={styles.editRow}>
          <View style={{ flex: 1 }}>
            <TextField
              label="Minutes"
              value={t.durationMinutes}
              onChangeText={(v) => updateTier(i, "durationMinutes", v)}
              keyboardType="number-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Price (₹)" value={t.price} onChangeText={(v) => updateTier(i, "price", v)} keyboardType="decimal-pad" />
          </View>
          <Button title="Remove" variant="danger" onPress={() => setTiers((prev) => prev.filter((_, idx) => idx !== i))} />
        </View>
      ))}
      <Button
        title="+ Add duration tier"
        variant="secondary"
        onPress={() => setTiers((prev) => [...prev, { durationMinutes: "", price: "" }])}
      />

      {showPackages ? (
        <>
          {packages.map((p, i) => (
            <View key={i} style={styles.editRow}>
              <View style={{ flex: 1 }}>
                <TextField label="Coins" value={p.quantity} onChangeText={(v) => updatePackage(i, "quantity", v)} keyboardType="number-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <TextField
                  label="Price (₹)"
                  value={p.price}
                  onChangeText={(v) => updatePackage(i, "price", v)}
                  keyboardType="decimal-pad"
                />
              </View>
              <Button title="Remove" variant="danger" onPress={() => setPackages((prev) => prev.filter((_, idx) => idx !== i))} />
            </View>
          ))}
          <Button
            title="+ Add coin package"
            variant="secondary"
            onPress={() => setPackages((prev) => [...prev, { quantity: "", price: "" }])}
          />
        </>
      ) : null}

      <TextField
        label="Extra controller price (₹, optional)"
        value={controllerPrice}
        onChangeText={setControllerPrice}
        keyboardType="decimal-pad"
        placeholder="Leave blank if not applicable"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Save pricing" onPress={save} loading={saving} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl },
  title: { ...typography.h1, color: colors.text },
  sectionTitle: { color: colors.accent, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  stationRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  stationLabel: { color: colors.text, fontSize: 14, fontWeight: "700" },
  error: { color: colors.maintenance, fontSize: 13 },
  editor: { gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  editRow: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-end" },
});

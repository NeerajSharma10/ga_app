import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { INDIA_PHONE_REGEX } from "@ga-app/shared-types";
import type { StationDTO, CustomerDTO, SessionDTO, DiscountType } from "@ga-app/shared-types";
import type { DashboardStackParamList } from "../navigation/types";
import { api, ApiError } from "../lib/api";
import { previewSessionPrice, previewBaseAmount } from "../lib/pricing-preview";
import { colors, spacing, typography } from "../theme";
import { Card } from "../components/Card";
import { TextField } from "../components/TextField";
import { Button } from "../components/Button";

type Props = NativeStackScreenProps<DashboardStackParamList, "StartSession">;

export function StartSessionScreen({ route, navigation }: Props) {
  const { stationId } = route.params;
  const queryClient = useQueryClient();

  const { data: stations } = useQuery({
    queryKey: ["stations"],
    queryFn: () => api.get<StationDTO[]>("/stations"),
  });
  const station = stations?.find((s) => s.id === stationId);
  const isCoinGame = station?.gameType?.category === "COIN";

  const [phone, setPhone] = useState("");
  const [customer, setCustomer] = useState<CustomerDTO | null>(null);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [looking, setLooking] = useState(false);

  const [duration, setDuration] = useState("60");
  const [coinPackageId, setCoinPackageId] = useState<number | null>(null);
  const [extraControllers, setExtraControllers] = useState("0");
  const [discountType, setDiscountType] = useState<DiscountType | undefined>(undefined);
  const [discountValue, setDiscountValue] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [baseOverride, setBaseOverride] = useState<string | null>(null);

  const [step, setStep] = useState<"details" | "payment">("details");
  const [session, setSession] = useState<SessionDTO | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const resolvedBaseAmount = useMemo(() => {
    if (baseOverride !== null) return Number(baseOverride) || 0;
    if (!station?.gameType) return 0;
    if (isCoinGame) {
      const pkg = station.gameType.coinPackages.find((p) => p.id === coinPackageId);
      return pkg?.price ?? 0;
    }
    return previewBaseAmount(station.gameType, Number(duration) || 0);
  }, [station, isCoinGame, coinPackageId, duration, baseOverride]);

  const preview = useMemo(() => {
    if (!station?.gameType) return null;
    return previewSessionPrice({
      baseAmount: resolvedBaseAmount,
      gameType: station.gameType,
      extraControllers: Number(extraControllers) || 0,
      discountType,
      discountValue: Number(discountValue) || 0,
      isMember: customer?.isMember,
      memberDiscountPercent: customer?.memberDiscountPercent,
    });
  }, [station, resolvedBaseAmount, extraControllers, discountType, discountValue, customer]);

  async function lookupPhone() {
    setLookupError("");
    if (!INDIA_PHONE_REGEX.test(phone)) return;
    setLooking(true);
    try {
      const results = await api.get<CustomerDTO[]>(`/customers?phone=${phone}`);
      setCustomer(results[0] ?? null);
      if (!results[0]) {
        setNewName("");
        setNewAddress("");
      }
    } catch (err) {
      setLookupError(err instanceof ApiError ? err.message : "Lookup failed");
    } finally {
      setLooking(false);
    }
  }

  // Trigger the lookup the moment a valid 10-digit number is typed, rather
  // than waiting for the field to blur - onEndEditing doesn't fire reliably
  // on every platform, which was letting staff create duplicate customers
  // for numbers that already existed.
  useEffect(() => {
    if (INDIA_PHONE_REGEX.test(phone)) {
      lookupPhone();
    } else {
      setCustomer(null);
    }
  }, [phone]);

  async function ensureCustomer(): Promise<CustomerDTO> {
    if (customer) return customer;
    if (!newName.trim()) throw new Error("Enter the customer's name");
    return api.post<CustomerDTO>("/customers", { name: newName, phone, address: newAddress || undefined });
  }

  async function handleStart() {
    if (!station || !preview) return;
    setFormError("");
    if (isCoinGame && coinPackageId === null && baseOverride === null) {
      setFormError("Pick a coin package");
      return;
    }
    setSubmitting(true);
    try {
      const activeCustomer = await ensureCustomer();
      const created = await api.post<SessionDTO>("/sessions", {
        stationId: station.id,
        customerId: activeCustomer.id,
        durationMinutes: isCoinGame ? undefined : Number(duration),
        coinPackageId: isCoinGame ? (coinPackageId ?? undefined) : undefined,
        extraControllers: Number(extraControllers) || 0,
        baseAmountOverride: baseOverride !== null ? Number(baseOverride) : undefined,
        discountType,
        discountValue: discountValue ? Number(discountValue) : undefined,
        discountReason: discountReason || undefined,
      });
      setSession(created);
      setStep("payment");
      queryClient.invalidateQueries({ queryKey: ["stations"] });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Could not start session");
    } finally {
      setSubmitting(false);
    }
  }

  // Collecting payment here (right after starting) does NOT free the
  // station - the customer is still playing. The station only frees up when
  // staff ends the session later from the Active tab.
  async function handlePayment(paymentType: "CASH" | "ONLINE") {
    if (!session) return;
    setFormError("");
    setSubmitting(true);
    try {
      await api.put(`/sessions/${session.id}/pay`, { paymentType });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      navigation.navigate("StationDashboard");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Payment failed");
    } finally {
      setSubmitting(false);
    }
  }

  function handlePayLater() {
    queryClient.invalidateQueries({ queryKey: ["sessions"] });
    navigation.navigate("StationDashboard");
  }

  if (!station) {
    return (
      <View style={styles.screen}>
        <Text style={styles.label}>Loading station…</Text>
      </View>
    );
  }

  if (step === "payment" && session) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Session started</Text>
        <Card style={{ gap: spacing.sm }}>
          <Row label="Station" value={`${station.gameType?.name} · ${station.label}`} />
          {session.durationMinutes ? <Row label="Duration" value={`${session.durationMinutes} min`} /> : null}
          <Row label="Amount due" value={`₹${preview?.totalAmount.toFixed(2)}`} big />
        </Card>
        <Text style={styles.label}>The station stays occupied either way - this just records whether they paid now.</Text>
        {formError ? <Text style={styles.error}>{formError}</Text> : null}
        <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
          <Button title="Collect cash now" onPress={() => handlePayment("CASH")} loading={submitting} />
          <Button title="Collect online (QR) now" variant="secondary" onPress={() => handlePayment("ONLINE")} loading={submitting} />
          <Button title="Pay later" variant="secondary" onPress={handlePayLater} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.xxl }}>
      <Text style={styles.title}>{station.gameType?.name} · {station.label}</Text>

      <Card style={{ gap: spacing.md }}>
        <Text style={styles.sectionTitle}>Customer</Text>
        <TextField
          label="Mobile number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="number-pad"
          maxLength={10}
          error={lookupError}
        />
        {looking ? <Text style={styles.label}>Looking up…</Text> : null}
        {customer ? (
          <View style={{ gap: spacing.xs }}>
            <Row label="Name" value={customer.name} />
            {customer.isMember ? <Row label="Membership" value={`Member (${customer.memberDiscountPercent}% off)`} /> : null}
          </View>
        ) : phone.length === 10 ? (
          <View style={{ gap: spacing.md }}>
            <TextField label="Name" value={newName} onChangeText={setNewName} placeholder="Customer name" />
            <TextField label="Address (optional)" value={newAddress} onChangeText={setNewAddress} placeholder="Address" />
          </View>
        ) : null}
      </Card>

      <Card style={{ gap: spacing.md }}>
        <Text style={styles.sectionTitle}>Session</Text>
        {isCoinGame ? (
          <View style={{ gap: spacing.sm }}>
            <Text style={styles.label}>Coin package</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {station.gameType?.coinPackages.map((pkg) => (
                <Button
                  key={pkg.id}
                  title={`${pkg.quantity} coins · ₹${pkg.price}`}
                  variant={coinPackageId === pkg.id ? "primary" : "secondary"}
                  onPress={() => setCoinPackageId(pkg.id)}
                />
              ))}
            </View>
          </View>
        ) : (
          <TextField label="Duration (minutes)" value={duration} onChangeText={setDuration} keyboardType="number-pad" />
        )}
        <TextField
          label="Extra controllers"
          value={extraControllers}
          onChangeText={setExtraControllers}
          keyboardType="number-pad"
        />
        <TextField
          label="Base price (auto-filled, editable)"
          value={baseOverride ?? String(resolvedBaseAmount)}
          onChangeText={setBaseOverride}
          keyboardType="decimal-pad"
        />
      </Card>

      <Card style={{ gap: spacing.md }}>
        <Text style={styles.sectionTitle}>Discount (optional)</Text>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Button
            title="% off"
            variant={discountType === "PERCENT" ? "primary" : "secondary"}
            onPress={() => setDiscountType(discountType === "PERCENT" ? undefined : "PERCENT")}
            style={{ flex: 1 }}
          />
          <Button
            title="₹ off"
            variant={discountType === "AMOUNT" ? "primary" : "secondary"}
            onPress={() => setDiscountType(discountType === "AMOUNT" ? undefined : "AMOUNT")}
            style={{ flex: 1 }}
          />
        </View>
        {discountType ? (
          <>
            <TextField label="Value" value={discountValue} onChangeText={setDiscountValue} keyboardType="decimal-pad" />
            <TextField label="Reason" value={discountReason} onChangeText={setDiscountReason} placeholder="e.g. regular customer" />
          </>
        ) : null}
      </Card>

      {preview ? (
        <Card style={{ gap: spacing.xs }}>
          <Row label="Base" value={`₹${preview.baseAmount.toFixed(2)}`} />
          {preview.controllerAddon > 0 ? <Row label="Controllers" value={`+ ₹${preview.controllerAddon.toFixed(2)}`} /> : null}
          {preview.manualDiscountAmount > 0 ? <Row label="Discount" value={`- ₹${preview.manualDiscountAmount.toFixed(2)}`} /> : null}
          {preview.membershipDiscountAmount > 0 ? (
            <Row label="Membership" value={`- ₹${preview.membershipDiscountAmount.toFixed(2)}`} />
          ) : null}
          <Row label="Total" value={`₹${preview.totalAmount.toFixed(2)}`} big />
        </Card>
      ) : null}

      {formError ? <Text style={styles.error}>{formError}</Text> : null}
      <Button title="Start session" onPress={handleStart} loading={submitting} />
    </ScrollView>
  );
}

function Row({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, big ? { fontSize: 18, fontWeight: "700", color: colors.text } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.sm },
  sectionTitle: { color: colors.accent, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  label: { color: colors.textDim, fontSize: 13 },
  value: { color: colors.text, fontSize: 14, fontWeight: "600" },
  error: { color: colors.maintenance, fontSize: 13, textAlign: "center" },
});

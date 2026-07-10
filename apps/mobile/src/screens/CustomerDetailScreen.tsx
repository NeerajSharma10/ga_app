import { View, Text, StyleSheet, FlatList } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { CustomerDTO, SessionDTO } from "@ga-app/shared-types";
import type { CustomersStackParamList } from "../navigation/types";
import { api } from "../lib/api";
import { colors, radius, spacing, typography } from "../theme";
import { Card } from "../components/Card";

type Props = NativeStackScreenProps<CustomersStackParamList, "CustomerDetail">;

export function CustomerDetailScreen({ route }: Props) {
  const { customerId } = route.params;

  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: () => api.get<CustomerDTO[]>("/customers"),
  });
  const customer = customers?.find((c) => c.id === customerId);

  const { data: sessions } = useQuery({
    queryKey: ["sessions", "customer", customerId],
    queryFn: () => api.get<SessionDTO[]>(`/sessions?customerId=${customerId}`),
  });

  const completed = sessions?.filter((s) => s.endTime) ?? [];
  const totalSpent = completed.reduce((sum, s) => sum + (s.totalAmount ?? s.baseAmount), 0);

  return (
    <View style={styles.screen}>
      <Card style={{ gap: spacing.sm }}>
        <Text style={styles.name}>{customer?.name ?? "…"}</Text>
        <Text style={styles.phone}>{customer?.phone}</Text>
        {customer?.address ? <Text style={styles.address}>{customer.address}</Text> : null}
        {customer?.isMember ? <Text style={styles.member}>Member · {customer.memberDiscountPercent}% off</Text> : null}
        <View style={styles.statsRow}>
          <View>
            <Text style={styles.statLabel}>Visits</Text>
            <Text style={styles.statValue}>{completed.length}</Text>
          </View>
          <View>
            <Text style={styles.statLabel}>Total spent</Text>
            <Text style={styles.statValue}>₹{totalSpent.toFixed(0)}</Text>
          </View>
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Past transactions</Text>
      <FlatList
        data={completed}
        keyExtractor={(s) => String(s.id)}
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xl }}
        ListEmptyComponent={<Text style={styles.empty}>No past sessions yet.</Text>}
        renderItem={({ item }) => (
          <Card style={styles.sessionCard}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.gameLabel}>{item.station?.gameType?.name} · {item.station?.label}</Text>
              <Text style={styles.date}>
                {new Date(item.startTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
              </Text>
              {item.durationMinutes ? <Text style={styles.date}>{item.durationMinutes} min</Text> : null}
            </View>
            <View style={{ alignItems: "flex-end", gap: 2 }}>
              <Text style={styles.amount}>₹{(item.totalAmount ?? item.baseAmount).toFixed(2)}</Text>
              <Text style={styles.date}>{item.paymentType ?? "—"}</Text>
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl, gap: spacing.lg },
  name: { ...typography.h2, color: colors.text },
  phone: { color: colors.textDim, fontSize: 14 },
  address: { color: colors.textDim, fontSize: 13 },
  member: { color: colors.accent, fontSize: 12, fontWeight: "600" },
  statsRow: { flexDirection: "row", gap: spacing.xl, marginTop: spacing.sm },
  statLabel: { color: colors.textDim, fontSize: 11, textTransform: "uppercase" },
  statValue: { color: colors.text, fontSize: 20, fontWeight: "800", fontVariant: ["tabular-nums"] },
  sectionTitle: { color: colors.accent, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  empty: { color: colors.textDim, textAlign: "center", marginTop: spacing.xxl },
  sessionCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: radius.lg },
  gameLabel: { color: colors.accent, fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  date: { color: colors.textDim, fontSize: 12 },
  amount: { color: colors.text, fontSize: 15, fontWeight: "700" },
});

import { useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { CustomerDTO } from "@ga-app/shared-types";
import type { CustomersStackParamList } from "../navigation/types";
import { api } from "../lib/api";
import { colors, radius, spacing, typography } from "../theme";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";

type Props = NativeStackScreenProps<CustomersStackParamList, "Customers">;

export function CustomersScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [promptForId, setPromptForId] = useState<number | null>(null);
  const [discountInput, setDiscountInput] = useState("10");
  const [promptError, setPromptError] = useState("");

  const { data: customers, refetch, isFetching } = useQuery({
    queryKey: ["customers"],
    queryFn: () => api.get<CustomerDTO[]>("/customers"),
  });

  const filtered = useMemo(() => {
    if (!customers) return [];
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [customers, search]);

  async function removeMembership(customer: CustomerDTO) {
    setUpdatingId(customer.id);
    try {
      await api.put(`/customers/${customer.id}/membership`, { isMember: false });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    } finally {
      setUpdatingId(null);
    }
  }

  async function confirmMembership(customer: CustomerDTO) {
    setPromptError("");
    const percent = Number(discountInput);
    if (!discountInput || Number.isNaN(percent) || percent < 0 || percent > 100) {
      setPromptError("Enter a number between 0 and 100");
      return;
    }
    setUpdatingId(customer.id);
    try {
      await api.put(`/customers/${customer.id}/membership`, { isMember: true, memberDiscountPercent: percent });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setPromptForId(null);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={styles.title}>Customers</Text>
        <Button title="Refresh" variant="secondary" onPress={() => refetch()} loading={isFetching} />
      </View>
      <TextField label="Search" value={search} onChangeText={setSearch} placeholder="Name or mobile number" />
      <FlatList
        data={filtered}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={{ gap: spacing.md, paddingVertical: spacing.lg, paddingBottom: spacing.xl }}
        ListEmptyComponent={<Text style={styles.empty}>No customers found.</Text>}
        renderItem={({ item }) => (
          <Card style={{ gap: spacing.sm, borderRadius: radius.lg }}>
            <Pressable onPress={() => navigation.navigate("CustomerDetail", { customerId: item.id })}>
              <View style={styles.card}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.phone}>{item.phone}</Text>
                  {item.isMember ? <Text style={styles.member}>Member · {item.memberDiscountPercent}% off</Text> : null}
                </View>
                <Button
                  title={item.isMember ? "Remove" : "Make member"}
                  variant={item.isMember ? "danger" : "secondary"}
                  onPress={() => (item.isMember ? removeMembership(item) : setPromptForId(item.id))}
                  loading={updatingId === item.id}
                />
              </View>
            </Pressable>
            {promptForId === item.id ? (
              <View style={{ gap: spacing.sm }}>
                <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "flex-end" }}>
                  <View style={{ flex: 1 }}>
                    <TextField label="Discount %" value={discountInput} onChangeText={setDiscountInput} keyboardType="number-pad" />
                  </View>
                  <Button title="Confirm" onPress={() => confirmMembership(item)} loading={updatingId === item.id} />
                </View>
                {promptError ? <Text style={styles.error}>{promptError}</Text> : null}
              </View>
            ) : null}
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl, gap: spacing.md },
  title: { ...typography.h1, color: colors.text },
  empty: { color: colors.textDim, textAlign: "center", marginTop: spacing.xxl },
  card: { flexDirection: "row", alignItems: "center", gap: spacing.md, borderRadius: radius.lg },
  name: { color: colors.text, fontSize: 15, fontWeight: "700" },
  phone: { color: colors.textDim, fontSize: 13 },
  member: { color: colors.accent, fontSize: 12, fontWeight: "600" },
  error: { color: colors.maintenance, fontSize: 12 },
});

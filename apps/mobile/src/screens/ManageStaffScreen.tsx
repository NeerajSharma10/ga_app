import { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { INDIA_PHONE_REGEX } from "@ga-app/shared-types";
import type { UserDTO } from "@ga-app/shared-types";
import { api, ApiError } from "../lib/api";
import { colors, spacing, typography } from "../theme";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";

export function ManageStaffScreen() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "SUPER_ADMIN">("ADMIN");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get<UserDTO[]>("/users"),
  });

  async function addUser() {
    setFormError("");
    if (!name.trim()) return setFormError("Enter a name");
    if (!INDIA_PHONE_REGEX.test(phone)) return setFormError("Enter a valid 10-digit Indian mobile number");
    if (password.length < 6) return setFormError("Password must be at least 6 characters");

    setSaving(true);
    try {
      await api.post("/users", { name, phone, password, role });
      setName("");
      setPhone("");
      setPassword("");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not add staff");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user: UserDTO) {
    await api.put(`/users/${user.id}`, { active: !user.active });
    queryClient.invalidateQueries({ queryKey: ["users"] });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.xxl }}>
      <Text style={styles.title}>Staff accounts</Text>

      <Card style={{ gap: spacing.md }}>
        <Text style={styles.sectionTitle}>Add staff member</Text>
        <TextField label="Name" value={name} onChangeText={setName} />
        <TextField label="Mobile number" value={phone} onChangeText={setPhone} keyboardType="number-pad" maxLength={10} />
        <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Button title="Admin" variant={role === "ADMIN" ? "primary" : "secondary"} onPress={() => setRole("ADMIN")} style={{ flex: 1 }} />
          <Button title="Super Admin" variant={role === "SUPER_ADMIN" ? "primary" : "secondary"} onPress={() => setRole("SUPER_ADMIN")} style={{ flex: 1 }} />
        </View>
        {formError ? <Text style={styles.error}>{formError}</Text> : null}
        <Button title="Add staff" onPress={addUser} loading={saving} />
      </Card>

      <Card style={{ gap: spacing.md }}>
        <Text style={styles.sectionTitle}>Existing staff</Text>
        {users?.map((u) => (
          <View key={u.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{u.name}</Text>
              <Text style={styles.meta}>{u.phone} · {u.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}</Text>
            </View>
            <Button
              title={u.active ? "Deactivate" : "Activate"}
              variant={u.active ? "danger" : "secondary"}
              onPress={() => toggleActive(u)}
            />
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
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  name: { color: colors.text, fontSize: 14, fontWeight: "700" },
  meta: { color: colors.textDim, fontSize: 12 },
  error: { color: colors.maintenance, fontSize: 13 },
});

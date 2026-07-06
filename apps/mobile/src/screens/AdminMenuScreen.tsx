import { View, Text, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AdminStackParamList } from "../navigation/types";
import { colors, spacing, typography } from "../theme";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { useAuthStore } from "../lib/auth-store";

type Props = NativeStackScreenProps<AdminStackParamList, "AdminMenu">;

export function AdminMenuScreen({ navigation }: Props) {
  const logout = useAuthStore((s) => s.logout);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Owner tools</Text>
      <Card style={{ gap: spacing.md }}>
        <Button title="Revenue reports" variant="secondary" onPress={() => navigation.navigate("Reports")} />
        <Button title="Manage stations & pricing" variant="secondary" onPress={() => navigation.navigate("ManageStations")} />
        <Button title="Manage staff" variant="secondary" onPress={() => navigation.navigate("ManageStaff")} />
      </Card>
      <Button title="Log out" variant="danger" onPress={logout} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl, gap: spacing.lg },
  title: { ...typography.h1, color: colors.text },
});

import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { GameCategory, StationDTO } from "@ga-app/shared-types";
import type { DashboardStackParamList } from "../navigation/types";
import { api } from "../lib/api";
import { colors, radius, spacing, typography } from "../theme";
import { Card } from "../components/Card";
import { StatusPill } from "../components/StatusPill";
import { useAuthStore } from "../lib/auth-store";

type IoniconName = keyof typeof Ionicons.glyphMap;

const CATEGORY_ICONS: Record<GameCategory, IoniconName> = {
  CONSOLE: "game-controller",
  TABLE: "disc",
  BOARD: "grid",
  COIN: "cash",
};

type Props = NativeStackScreenProps<DashboardStackParamList, "StationDashboard">;

export function StationDashboardScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { data: stations, refetch, isFetching } = useQuery({
    queryKey: ["stations"],
    queryFn: () => api.get<StationDTO[]>("/stations"),
    refetchInterval: 15_000,
  });

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Text style={styles.greeting}>Welcome back, {user?.name?.split(" ")[0]}</Text>
          <Pressable onPress={logout}>
            <Text style={styles.logout}>Log out</Text>
          </Pressable>
        </View>
        <Text style={styles.title}>Stations</Text>
      </View>

      <FlatList
        data={stations ?? []}
        keyExtractor={(s) => String(s.id)}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing.md }}
        contentContainerStyle={styles.grid}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.accent} />}
        renderItem={({ item }) => (
          <Pressable
            style={{ flex: 1 }}
            disabled={item.status !== "AVAILABLE"}
            onPress={() => navigation.navigate("StartSession", { stationId: item.id })}
          >
            <Card style={[styles.stationCard, item.status !== "AVAILABLE" ? { opacity: 0.65 } : null]}>
              <View style={styles.iconBadge}>
                {item.gameType ? (
                  <Ionicons name={CATEGORY_ICONS[item.gameType.category]} size={18} color={colors.accent} />
                ) : null}
              </View>
              <Text style={styles.gameType}>{item.gameType?.name}</Text>
              <Text style={styles.stationLabel}>{item.label}</Text>
              <StatusPill status={item.status} />
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { padding: spacing.xl, paddingBottom: spacing.md, gap: spacing.xs },
  greeting: { color: colors.textDim, fontSize: 13 },
  logout: { color: colors.accent2, fontSize: 13, fontWeight: "600" },
  title: { ...typography.h1, color: colors.text },
  grid: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.md },
  stationCard: { gap: spacing.sm, minHeight: 110, borderRadius: radius.lg },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: `${colors.accent}1A`,
    alignItems: "center",
    justifyContent: "center",
  },
  gameType: { color: colors.textDim, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  stationLabel: { color: colors.text, fontSize: 16, fontWeight: "700" },
});

import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { colors, radius, spacing, typography } from "../theme";
import { Card } from "../components/Card";

interface RevenueRow {
  key: string;
  sessionCount: number;
  totalRevenue: number;
}

interface RevenueReport {
  range: { from: string; to: string };
  totalRevenue: number;
  sessionCount: number;
  byDay: RevenueRow[];
  byGameType: RevenueRow[];
  byStaff: RevenueRow[];
}

export function ReportsScreen() {
  const { data } = useQuery({
    queryKey: ["reports", "revenue"],
    queryFn: () => api.get<RevenueReport>("/reports/revenue"),
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.xxl }}>
      <Text style={styles.title}>Reports</Text>
      <Text style={styles.subtitle}>Last 30 days</Text>

      <Card style={styles.totalsRow}>
        <View>
          <Text style={styles.label}>Revenue</Text>
          <Text style={styles.bigNumber}>₹{data?.totalRevenue.toFixed(0) ?? "—"}</Text>
        </View>
        <View>
          <Text style={styles.label}>Sessions</Text>
          <Text style={styles.bigNumber}>{data?.sessionCount ?? "—"}</Text>
        </View>
      </Card>

      <ReportSection title="By game" rows={data?.byGameType} />
      <ReportSection title="By staff" rows={data?.byStaff} />
      <ReportSection title="By day" rows={data?.byDay} />
    </ScrollView>
  );
}

function ReportSection({ title, rows }: { title: string; rows?: RevenueRow[] }) {
  const max = Math.max(1, ...(rows ?? []).map((r) => r.totalRevenue));
  return (
    <Card style={{ gap: spacing.md }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {(rows ?? []).map((row) => (
        <View key={row.key} style={{ gap: 4 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={styles.rowLabel}>{row.key}</Text>
            <Text style={styles.rowValue}>₹{row.totalRevenue.toFixed(0)} · {row.sessionCount}</Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${(row.totalRevenue / max) * 100}%` }]} />
          </View>
        </View>
      ))}
      {!rows?.length ? <Text style={styles.rowLabel}>No data yet.</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl },
  title: { ...typography.h1, color: colors.text },
  subtitle: { color: colors.textDim, fontSize: 13, marginBottom: spacing.sm },
  totalsRow: { flexDirection: "row", justifyContent: "space-around", borderRadius: radius.lg },
  label: { color: colors.textDim, fontSize: 12, textTransform: "uppercase" },
  bigNumber: { color: colors.text, fontSize: 26, fontWeight: "800", fontVariant: ["tabular-nums"] },
  sectionTitle: { color: colors.accent, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  rowLabel: { color: colors.text, fontSize: 13, fontWeight: "600" },
  rowValue: { color: colors.textDim, fontSize: 12, fontVariant: ["tabular-nums"] },
  barTrack: { height: 6, backgroundColor: colors.panelAlt, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 6, backgroundColor: colors.accent, borderRadius: 3 },
});

import { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "../lib/api";
import { downloadFile } from "../lib/download-file";
import { colors, radius, spacing, typography } from "../theme";
import { Card } from "../components/Card";
import { TextField } from "../components/TextField";
import { Button } from "../components/Button";

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

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ReportsScreen() {
  const { data } = useQuery({
    queryKey: ["reports", "revenue"],
    queryFn: () => api.get<RevenueReport>("/reports/revenue"),
  });

  const [fromDate, setFromDate] = useState(todayIso());
  const [toDate, setToDate] = useState(todayIso());
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  async function handleExport() {
    setExportError("");
    if (fromDate > toDate) return setExportError("Start date must be before end date");
    setExporting(true);
    try {
      const suffix = fromDate === toDate ? fromDate : `${fromDate}_to_${toDate}`;
      await downloadFile(`/reports/sessions.csv?from=${fromDate}&to=${toDate}`, `sessions-${suffix}.csv`, "text/csv");
    } catch (err) {
      setExportError(err instanceof ApiError ? err.message : "Could not download report");
    } finally {
      setExporting(false);
    }
  }

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

      <Card style={{ gap: spacing.md }}>
        <Text style={styles.sectionTitle}>Export sessions</Text>
        <Text style={styles.label}>Every session in the range — customer, game, duration, amount, payment method.</Text>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <TextField label="Start date (YYYY-MM-DD)" value={fromDate} onChangeText={setFromDate} placeholder={todayIso()} />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="End date (YYYY-MM-DD)" value={toDate} onChangeText={setToDate} placeholder={todayIso()} />
          </View>
        </View>
        {exportError ? <Text style={styles.error}>{exportError}</Text> : null}
        <Button title="Download CSV" onPress={handleExport} loading={exporting} />
      </Card>
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
  error: { color: colors.maintenance, fontSize: 12 },
});

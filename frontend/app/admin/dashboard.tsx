import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, useWindowDimensions } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";

import { AppShell } from "@/src/components/AppShell";
import { Card, Chip, ChipRow, Loading, StatusBadge, Avatar, EmptyState } from "@/src/components/ui";
import { ProgressChart } from "@/src/components/ProgressChart";
import { useGuard } from "@/src/hooks/useGuard";
import { api } from "@/src/api/client";
import { colors, spacing, radii, statusColors, areaLabel } from "@/src/theme/tokens";
import { fmtTime, fmtDate } from "@/src/utils/format";

export default function AdminDashboard() {
  const { user, ready } = useGuard("admin");
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const [area, setArea] = useState<string>("todos");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api.adminDashboard(area);
      setData(d);
    } catch {}
    finally {
      setLoading(false);
    }
  }, [area]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (!ready) return <Loading />;

  const kpis = [
    { key: "today", label: "Atendimentos hoje", value: data?.today_count ?? 0, icon: "calendar" as const, tint: colors.brandPrimary },
    { key: "confirmed", label: "Confirmados", value: data?.confirmados ?? 0, icon: "check-circle" as const, tint: colors.success },
    { key: "faltas", label: "Faltas", value: data?.faltas ?? 0, icon: "user-x" as const, tint: colors.error },
    { key: "patients", label: "Pacientes", value: data?.total_patients ?? 0, icon: "users" as const, tint: colors.info },
    { key: "pending", label: "Pagam. pendentes", value: data?.pending_payments ?? 0, icon: "credit-card" as const, tint: colors.warning },
  ];

  return (
    <AppShell role="admin" active="dashboard" title="Dashboard" subtitle={`Olá, ${user?.name?.split(" ")[0] ?? ""}`}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandPrimary} />}
      >
        <View style={styles.chipWrap}>
          <ChipRow>
            {["todos", "fisio", "pilates"].map((a) => (
              <Chip
                key={a}
                testID={`dash-filter-${a}`}
                label={a === "todos" ? "Todos" : areaLabel[a]}
                active={area === a}
                onPress={() => setArea(a)}
              />
            ))}
          </ChipRow>
        </View>

        {loading ? (
          <Loading />
        ) : (
          <View style={styles.container}>
            <View style={styles.kpiGrid}>
              {kpis.map((k) => (
                <Card key={k.key} testID={`kpi-${k.key}`} style={[styles.kpiCard, wide ? styles.kpiCardWide : styles.kpiCardMobile]}>
                  <View style={[styles.kpiIcon, { backgroundColor: k.tint + "22" }]}>
                    <Feather name={k.icon} size={18} color={k.tint} />
                  </View>
                  <Text style={styles.kpiValue}>{k.value}</Text>
                  <Text style={styles.kpiLabel}>{k.label}</Text>
                </Card>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Próximos atendimentos</Text>
            {(!data?.upcoming || data.upcoming.length === 0) ? (
              <EmptyState icon="calendar" title="Nenhum atendimento próximo" subtitle="Novos agendamentos aparecerão aqui." />
            ) : (
              data.upcoming.map((a: any) => {
                const sc = statusColors[a.status];
                return (
                  <Pressable
                    key={a.id}
                    testID={`dash-appt-${a.id}`}
                    onPress={() => router.push(`/admin/patient/${a.patient_id}`)}
                  >
                    <Card style={styles.apptCard}>
                      <Avatar name={a.patient_name} size={44} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.apptName} numberOfLines={1}>{a.patient_name}</Text>
                        <Text style={styles.apptMeta} numberOfLines={1}>
                          {a.procedure || areaLabel[a.area]} · {fmtDate(a.date)} {fmtTime(a.datetime)}
                        </Text>
                      </View>
                      <StatusBadge label={sc.label} bg={sc.bg} fg={sc.fg} />
                    </Card>
                  </Pressable>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xxxl },
  chipWrap: { paddingVertical: spacing.md },
  container: { paddingHorizontal: spacing.lg, gap: spacing.md },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.md },
  kpiCard: { gap: spacing.sm },
  kpiCardMobile: { width: "47%", flexGrow: 1 },
  kpiCardWide: { width: 190 },
  kpiIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  kpiValue: { fontSize: 28, fontWeight: "600", color: colors.onSurface },
  kpiLabel: { fontSize: 12, color: colors.onSurfaceTertiary },
  sectionTitle: { fontSize: 13, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase", color: colors.onSurfaceTertiary, marginTop: spacing.md, marginBottom: spacing.sm },
  apptCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.sm },
  apptName: { fontSize: 15, fontWeight: "500", color: colors.onSurface },
  apptMeta: { fontSize: 12, color: colors.onSurfaceTertiary, marginTop: 2 },
});

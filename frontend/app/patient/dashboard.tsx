import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";

import { AppShell } from "@/src/components/AppShell";
import { Card, Button, StatusBadge, Loading } from "@/src/components/ui";
import { useGuard } from "@/src/hooks/useGuard";
import { api } from "@/src/api/client";
import { colors, spacing, radii, images, statusColors, areaLabel } from "@/src/theme/tokens";
import { fmtDate, fmtTime, fmtWeekday } from "@/src/utils/format";

export default function PatientDashboard() {
  const { ready, user } = useGuard("patient");
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setData(await api.patientDashboard()); } catch {}
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (!ready) return <Loading />;

  const next = data?.next_appointment;

  return (
    <AppShell
      role="patient"
      active="dashboard"
      title="Início"
      headerRight={
        <Pressable testID="header-bell" onPress={() => router.replace("/patient/notifications")} hitSlop={8} style={styles.bell}>
          <Feather name="bell" size={22} color={colors.onSurface} />
          {data?.unread_notifications > 0 && <View style={styles.bellDot} />}
        </Pressable>
      }
    >
      {loading ? <Loading /> : (
        <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandPrimary} />}>
          {/* Hero */}
          <View style={styles.hero}>
            <Image source={{ uri: images.patientHero }} style={StyleSheet.absoluteFill} contentFit="cover" />
            <LinearGradient colors={["rgba(24,28,26,0.15)", "rgba(24,28,26,0.85)"]} style={StyleSheet.absoluteFill} />
            <View style={styles.heroContent}>
              <Text style={styles.heroGreeting}>Olá, {user?.name?.split(" ")[0]}</Text>
              <Text style={styles.heroSub}>Cuide do seu corpo hoje.</Text>
            </View>
          </View>

          {/* Next appointment */}
          <Text style={styles.section}>Próximo atendimento</Text>
          {next ? (
            <Card style={styles.nextCard}>
              <View style={styles.nextTop}>
                <View style={styles.dateBadge}>
                  <Text style={styles.dateBadgeDay}>{fmtDate(next.date).slice(0, 2)}</Text>
                  <Text style={styles.dateBadgeMon}>{fmtWeekday(next.date).slice(0, 3)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nextTitle}>{next.procedure || areaLabel[next.area]}</Text>
                  <Text style={styles.nextMeta}>{fmtDate(next.date)} às {fmtTime(next.datetime)}</Text>
                  {next.professional_name ? <Text style={styles.nextMeta}>{next.professional_name}</Text> : null}
                </View>
                <StatusBadge label={statusColors[next.status].label} bg={statusColors[next.status].bg} fg={statusColors[next.status].fg} />
              </View>
              <View style={styles.nextActions}>
                <Button title="Remarcar / Cancelar" variant="secondary" onPress={() => router.replace("/patient/history")} testID="manage-next" style={{ flex: 1, height: 44 }} />
              </View>
            </Card>
          ) : (
            <Card style={styles.emptyNext}>
              <Feather name="calendar" size={24} color={colors.brandPrimary} />
              <Text style={styles.emptyNextText}>Você não tem atendimentos agendados.</Text>
              <Button title="Agendar agora" icon="plus" onPress={() => router.replace("/patient/booking")} testID="book-now" style={{ marginTop: spacing.sm }} />
            </Card>
          )}

          {/* Quick stats */}
          <View style={styles.statsRow}>
            <Pressable style={{ flex: 1 }} testID="stat-exercises" onPress={() => router.replace("/patient/exercises")}>
              <Card style={styles.statCard}>
                <Feather name="activity" size={20} color={colors.brandPrimary} />
                <Text style={styles.statValue}>{data?.active_exercises ?? 0}</Text>
                <Text style={styles.statLabel}>Exercícios ativos</Text>
              </Card>
            </Pressable>
            <Pressable style={{ flex: 1 }} testID="stat-history" onPress={() => router.replace("/patient/history")}>
              <Card style={styles.statCard}>
                <Feather name="credit-card" size={20} color={colors.warning} />
                <Text style={styles.statValue}>{data?.pending_payments ?? 0}</Text>
                <Text style={styles.statLabel}>Pagam. pendentes</Text>
              </Card>
            </Pressable>
          </View>

          <Button title="Agendar novo atendimento" icon="plus-circle" onPress={() => router.replace("/patient/booking")} testID="dashboard-book" style={{ marginTop: spacing.md }} />
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg },
  bell: {},
  bellDot: { position: "absolute", top: -2, right: -2, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.error },
  hero: { height: 160, borderRadius: radii.lg, overflow: "hidden", marginBottom: spacing.lg, backgroundColor: colors.surfaceInverse },
  heroContent: { position: "absolute", left: spacing.lg, bottom: spacing.lg, right: spacing.lg },
  heroGreeting: { fontSize: 24, fontWeight: "600", color: "#FFFFFF" },
  heroSub: { fontSize: 14, color: "rgba(255,255,255,0.85)", marginTop: 2 },
  section: { fontSize: 13, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase", color: colors.onSurfaceTertiary, marginBottom: spacing.sm },
  nextCard: { marginBottom: spacing.lg },
  nextTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  dateBadge: { width: 52, height: 56, borderRadius: radii.md, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  dateBadgeDay: { fontSize: 20, fontWeight: "700", color: colors.brandPrimary },
  dateBadgeMon: { fontSize: 11, color: colors.brandPrimary },
  nextTitle: { fontSize: 16, fontWeight: "600", color: colors.onSurface },
  nextMeta: { fontSize: 13, color: colors.onSurfaceTertiary, marginTop: 2 },
  nextActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
  emptyNext: { alignItems: "center", gap: spacing.sm, marginBottom: spacing.lg },
  emptyNextText: { fontSize: 14, color: colors.onSurfaceSecondary, textAlign: "center" },
  statsRow: { flexDirection: "row", gap: spacing.md },
  statCard: { alignItems: "flex-start", gap: spacing.xs },
  statValue: { fontSize: 24, fontWeight: "600", color: colors.onSurface, marginTop: spacing.xs },
  statLabel: { fontSize: 12, color: colors.onSurfaceTertiary },
});

import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useFocusEffect } from "expo-router";

import { AppShell } from "@/src/components/AppShell";
import { Card, EmptyState, Loading, SectionTitle, StatusBadge } from "@/src/components/ui";
import { useGuard } from "@/src/hooks/useGuard";
import { api, Exercise } from "@/src/api/client";
import { colors, spacing } from "@/src/theme/tokens";

export default function PatientExercises() {
  const { ready, user } = useGuard("patient");
  const [list, setList] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.patient_id) return;
    setLoading(true);
    try { setList(await api.listExercises(user.patient_id)); } catch { setList([]); }
    finally { setLoading(false); }
  }, [user?.patient_id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!ready) return <Loading />;

  const active = list.filter((e) => e.active);
  const previous = list.filter((e) => !e.active);

  return (
    <AppShell role="patient" active="exercises" title="Exercícios para casa">
      {loading ? <Loading /> : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {list.length === 0 ? (
            <EmptyState icon="activity" title="Nenhum exercício" subtitle="Seu profissional ainda não prescreveu exercícios." />
          ) : (
            <>
              <SectionTitle>Ativos</SectionTitle>
              {active.length === 0 ? <Text style={styles.muted}>Nenhum exercício ativo no momento.</Text> : active.map((e) => <ExCard key={e.id} e={e} />)}
              {previous.length > 0 && (
                <>
                  <SectionTitle>Anteriores</SectionTitle>
                  {previous.map((e) => <ExCard key={e.id} e={e} faded />)}
                </>
              )}
            </>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </AppShell>
  );
}

function ExCard({ e, faded }: { e: Exercise; faded?: boolean }) {
  return (
    <Card style={[styles.card, faded && { opacity: 0.65 }]}>
      <View style={styles.head}>
        <Text style={styles.name}>{e.name}</Text>
        {e.active ? <StatusBadge label="Ativo" bg={colors.success + "22"} fg={colors.success} /> : null}
      </View>
      {e.description ? <Text style={styles.desc}>{e.description}</Text> : null}
      <View style={styles.metaRow}>
        {e.series ? <Meta icon label={`${e.series} séries`} /> : null}
        {e.repetitions ? <Meta label={`${e.repetitions} repetições`} /> : null}
        {e.frequency ? <Meta label={e.frequency} /> : null}
        {e.duration ? <Meta label={e.duration} /> : null}
      </View>
      {e.observacoes ? <Text style={styles.obs}>{e.observacoes}</Text> : null}
    </Card>
  );
}

function Meta({ label }: { label: string; icon?: boolean }) {
  return (
    <View style={styles.metaChip}>
      <Text style={styles.metaText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg },
  card: { marginBottom: spacing.md },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  name: { fontSize: 16, fontWeight: "600", color: colors.onSurface, flex: 1 },
  desc: { fontSize: 14, color: colors.onSurfaceSecondary, lineHeight: 20, marginBottom: spacing.md },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  metaChip: { backgroundColor: colors.brandTertiary, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 999 },
  metaText: { fontSize: 12, color: colors.brandPrimary, fontWeight: "500" },
  obs: { fontSize: 13, color: colors.onSurfaceTertiary, marginTop: spacing.md, fontStyle: "italic" },
  muted: { fontSize: 13, color: colors.onSurfaceTertiary, marginBottom: spacing.md },
});

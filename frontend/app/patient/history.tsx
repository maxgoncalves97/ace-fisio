import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";

import { AppShell } from "@/src/components/AppShell";
import { Card, Chip, ChipRow, Button, StatusBadge, EmptyState, Loading } from "@/src/components/ui";
import { FormModal } from "@/src/components/FormModal";
import { useGuard } from "@/src/hooks/useGuard";
import { api, Appointment, Payment } from "@/src/api/client";
import { colors, spacing, statusColors, payStatusColors, areaLabel } from "@/src/theme/tokens";
import { fmtBRL, fmtDate, fmtTime, fmtDateTime } from "@/src/utils/format";

export default function PatientHistory() {
  const { ready, user } = useGuard("patient");
  const [seg, setSeg] = useState<"atendimentos" | "pagamentos" | "orientacoes">("atendimentos");
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);

  const load = useCallback(async () => {
    if (!user?.patient_id) return;
    setLoading(true);
    try {
      const [a, p, n] = await Promise.all([
        api.listAppointments({ patient_id: user.patient_id }),
        api.listPayments({ patient_id: user.patient_id }),
        api.listNotes(user.patient_id),
      ]);
      setAppts(a);
      setPayments(p);
      setNotes(n);
    } catch {} finally { setLoading(false); }
  }, [user?.patient_id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const doCancel = async () => {
    if (!cancelTarget) return;
    try { await api.cancelAppointment(cancelTarget.id); setCancelTarget(null); load(); } catch {}
  };

  if (!ready) return <Loading />;

  const now = new Date();
  const upcoming = appts.filter((a) => new Date(a.datetime) >= now && a.status !== "cancelado");
  const past = appts.filter((a) => new Date(a.datetime) < now || a.status === "cancelado");

  return (
    <AppShell role="patient" active="history" title="Histórico">
      <View style={styles.segWrap}>
        <ChipRow>
          <Chip label="Atendimentos" active={seg === "atendimentos"} onPress={() => setSeg("atendimentos")} testID="seg-atendimentos" />
          <Chip label="Pagamentos" active={seg === "pagamentos"} onPress={() => setSeg("pagamentos")} testID="seg-pagamentos" />
          <Chip label="Orientações" active={seg === "orientacoes"} onPress={() => setSeg("orientacoes")} testID="seg-orientacoes" />
        </ChipRow>
      </View>

      {loading ? <Loading /> : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {seg === "atendimentos" && (
            <>
              <Text style={styles.section}>Próximos</Text>
              {upcoming.length === 0 ? <Text style={styles.muted}>Nenhum atendimento agendado.</Text> : upcoming.map((a) => (
                <ApptCard key={a.id} a={a} onCancel={() => setCancelTarget(a)} />
              ))}
              <Text style={[styles.section, { marginTop: spacing.lg }]}>Anteriores</Text>
              {past.length === 0 ? <Text style={styles.muted}>Nenhum atendimento anterior.</Text> : past.map((a) => (
                <ApptCard key={a.id} a={a} />
              ))}
            </>
          )}

          {seg === "pagamentos" && (
            payments.length === 0 ? <EmptyState icon="credit-card" title="Sem pagamentos" subtitle="Você não possui pagamentos registrados." /> : payments.map((p) => {
              const sc = payStatusColors[p.status];
              return (
                <Card key={p.id} style={{ marginBottom: spacing.sm }}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.payDesc}>{p.description || "Pagamento"}</Text>
                    <StatusBadge label={sc.label} bg={sc.bg} fg={sc.fg} />
                  </View>
                  <Text style={styles.payAmount}>{fmtBRL(p.amount)}</Text>
                  <Text style={styles.meta}>{areaLabel[p.area]} · Venc.: {fmtDate(p.due_date)}</Text>
                </Card>
              );
            })
          )}

          {seg === "orientacoes" && (
            notes.length === 0 ? <EmptyState icon="message-circle" title="Sem orientações" subtitle="Seu profissional ainda não enviou orientações." /> : notes.map((n) => (
              <Card key={n.id} style={{ marginBottom: spacing.sm }}>
                <Text style={styles.noteText}>{n.text}</Text>
                <Text style={styles.meta}>{n.professional} · {fmtDate(n.created_at)}</Text>
              </Card>
            ))
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      <FormModal visible={!!cancelTarget} onClose={() => setCancelTarget(null)} title="Cancelar atendimento" testID="cancel-modal" footer={
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <Button title="Voltar" variant="ghost" onPress={() => setCancelTarget(null)} style={{ flex: 1 }} testID="cancel-abort" />
          <Button title="Cancelar" variant="danger" onPress={doCancel} style={{ flex: 1 }} testID="cancel-confirm" />
        </View>
      }>
        <Text style={styles.confirmText}>
          Deseja cancelar o atendimento de {cancelTarget ? fmtDateTime(cancelTarget.datetime) : ""}?
        </Text>
        <Text style={styles.muted}>Para remarcar em menos de 12h, entre em contato com a clínica.</Text>
      </FormModal>
    </AppShell>
  );
}

function ApptCard({ a, onCancel }: { a: Appointment; onCancel?: () => void }) {
  const sc = statusColors[a.status];
  return (
    <Card style={{ marginBottom: spacing.sm }}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1 }}>
          <Text style={styles.apptTitle}>{a.procedure || areaLabel[a.area]}</Text>
          <Text style={styles.meta}>{fmtDate(a.date)} às {fmtTime(a.datetime)}</Text>
          {a.professional_name ? <Text style={styles.meta}>{a.professional_name}</Text> : null}
        </View>
        <StatusBadge label={sc.label} bg={sc.bg} fg={sc.fg} />
      </View>
      {onCancel && a.status !== "cancelado" && (
        <Button title="Cancelar" variant="ghost" icon="x-circle" onPress={onCancel} testID={`cancel-${a.id}`} style={{ marginTop: spacing.md, height: 42 }} />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  segWrap: { paddingVertical: spacing.md },
  scroll: { paddingHorizontal: spacing.lg },
  section: { fontSize: 13, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase", color: colors.onSurfaceTertiary, marginBottom: spacing.sm },
  muted: { fontSize: 13, color: colors.onSurfaceTertiary, marginBottom: spacing.md },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.md },
  apptTitle: { fontSize: 15, fontWeight: "600", color: colors.onSurface },
  meta: { fontSize: 12, color: colors.onSurfaceTertiary, marginTop: 2 },
  payDesc: { fontSize: 15, fontWeight: "500", color: colors.onSurface, flex: 1 },
  payAmount: { fontSize: 18, fontWeight: "600", color: colors.onSurface, marginTop: spacing.xs },
  noteText: { fontSize: 14, color: colors.onSurface, lineHeight: 20 },
  confirmText: { fontSize: 15, color: colors.onSurface, marginBottom: spacing.sm },
});

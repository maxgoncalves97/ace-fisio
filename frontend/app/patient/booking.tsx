import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { AppShell } from "@/src/components/AppShell";
import { Card, Button, Chip, Loading } from "@/src/components/ui";
import { useGuard } from "@/src/hooks/useGuard";
import { api, Procedure, Area } from "@/src/api/client";
import { colors, spacing, radii, areaLabel } from "@/src/theme/tokens";
import { toYMD, WEEKDAYS_SHORT, MONTHS } from "@/src/utils/format";

const TIME_SLOTS = (() => {
  const out: string[] = [];
  for (let h = 7; h <= 20; h++) { out.push(`${String(h).padStart(2, "0")}:00`); if (h < 20) out.push(`${String(h).padStart(2, "0")}:30`); }
  return out;
})();

export default function Booking() {
  const { ready, user } = useGuard("patient");
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [patientArea, setPatientArea] = useState<Area>("fisio");
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [area, setArea] = useState<"fisio" | "pilates">("fisio");
  const [procedure, setProcedure] = useState("");
  const [dateYmd, setDateYmd] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user?.patient_id) return;
      try {
        const p = await api.getPatient(user.patient_id);
        setPatientArea(p.area);
        setArea(p.area === "pilates" ? "pilates" : "fisio");
      } catch {}
      try { setProcedures(await api.listProcedures()); } catch {}
    })();
  }, [user?.patient_id]);

  const dates = useMemo(() => {
    const out = [];
    const base = new Date(); base.setHours(0, 0, 0, 0);
    for (let i = 0; i < 21; i++) { const d = new Date(base); d.setDate(base.getDate() + i); out.push(d); }
    return out;
  }, []);

  const procOptions = procedures.filter((p) => p.area === area || p.area === "ambos");
  const canPickArea = patientArea === "ambos";

  const confirm = async () => {
    setBusy(true); setErr(null);
    try {
      await api.createAppointment({ patient_id: user!.patient_id, area, procedure, date: dateYmd, time, duration_min: 60 });
      setDone(true);
    } catch (e: any) {
      setErr(e?.message ?? "Não foi possível agendar");
    } finally { setBusy(false); }
  };

  if (!ready) return <Loading />;

  if (done) {
    return (
      <AppShell role="patient" active="booking" title="Agendar">
        <View style={styles.doneWrap} testID="booking-success">
          <View style={styles.doneIcon}><Feather name="check" size={36} color={colors.onBrandPrimary} /></View>
          <Text style={styles.doneTitle}>Agendamento solicitado!</Text>
          <Text style={styles.doneSub}>Seu atendimento foi registrado. A clínica confirmará em breve.</Text>
          <Button title="Ver meus atendimentos" onPress={() => router.replace("/patient/history")} testID="goto-history" style={{ marginTop: spacing.lg, width: 240 }} />
          <Button title="Voltar ao início" variant="ghost" onPress={() => router.replace("/patient/dashboard")} testID="goto-dashboard" style={{ marginTop: spacing.sm, width: 240 }} />
        </View>
      </AppShell>
    );
  }

  return (
    <AppShell role="patient" active="booking" title="Agendar atendimento" subtitle={`Passo ${step} de 3`}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.steps}>
          {[1, 2, 3].map((s) => (
            <View key={s} style={[styles.stepDot, step >= s && styles.stepDotActive]} />
          ))}
        </View>

        {step === 1 && (
          <View>
            <Text style={styles.stepTitle}>Serviço</Text>
            {canPickArea && (
              <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg }}>
                <Chip label="Fisioterapia" active={area === "fisio"} onPress={() => { setArea("fisio"); setProcedure(""); }} testID="book-area-fisio" />
                <Chip label="Pilates" active={area === "pilates"} onPress={() => { setArea("pilates"); setProcedure(""); }} testID="book-area-pilates" />
              </View>
            )}
            <Text style={styles.help}>Selecione o procedimento em {areaLabel[area]}:</Text>
            {procOptions.map((p) => (
              <Pressable key={p.id} testID={`book-proc-${p.id}`} onPress={() => setProcedure(p.name)}>
                <Card style={[styles.optionCard, procedure === p.name && styles.optionCardActive]}>
                  <Text style={[styles.optionText, procedure === p.name && styles.optionTextActive]}>{p.name}</Text>
                  {procedure === p.name && <Feather name="check" size={18} color={colors.brandPrimary} />}
                </Card>
              </Pressable>
            ))}
            <Button title="Continuar" onPress={() => setStep(2)} disabled={!procedure} testID="step1-next" style={{ marginTop: spacing.lg }} />
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.stepTitle}>Data</Text>
            <View style={styles.dateGrid}>
              {dates.map((d) => {
                const ymd = toYMD(d);
                const active = ymd === dateYmd;
                return (
                  <Pressable key={ymd} testID={`book-date-${ymd}`} onPress={() => setDateYmd(ymd)} style={[styles.dateCell, active && styles.dateCellActive]}>
                    <Text style={[styles.dateWd, active && styles.dateActiveText]}>{WEEKDAYS_SHORT[d.getDay()]}</Text>
                    <Text style={[styles.dateNum, active && styles.dateActiveText]}>{d.getDate()}</Text>
                    <Text style={[styles.dateMon, active && styles.dateActiveText]}>{MONTHS[d.getMonth()].slice(0, 3)}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[styles.stepTitle, { marginTop: spacing.lg }]}>Horário</Text>
            <View style={styles.timeGrid}>
              {TIME_SLOTS.map((t) => {
                const active = t === time;
                return (
                  <Pressable key={t} testID={`book-time-${t}`} onPress={() => setTime(t)} style={[styles.timeCell, active && styles.timeCellActive]}>
                    <Text style={[styles.timeText, active && styles.dateActiveText]}>{t}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.lg }}>
              <Button title="Voltar" variant="ghost" onPress={() => setStep(1)} testID="step2-back" style={{ flex: 1 }} />
              <Button title="Continuar" onPress={() => setStep(3)} disabled={!dateYmd || !time} testID="step2-next" style={{ flex: 1 }} />
            </View>
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={styles.stepTitle}>Confirmar</Text>
            <Card style={{ marginBottom: spacing.lg }}>
              <SummaryRow k="Serviço" v={areaLabel[area]} />
              <SummaryRow k="Procedimento" v={procedure} />
              <SummaryRow k="Data" v={`${WEEKDAYS_SHORT[new Date(dateYmd + "T00:00:00").getDay()]}, ${dateYmd.split("-").reverse().join("/")}`} />
              <SummaryRow k="Horário" v={time} last />
            </Card>
            <View style={styles.ruleBox}>
              <Feather name="info" size={16} color={colors.warning} />
              <Text style={styles.ruleText}>Agendamentos online exigem no mínimo 12 horas de antecedência.</Text>
            </View>
            {err ? <Text style={styles.err} testID="booking-error">{err}</Text> : null}
            <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.lg }}>
              <Button title="Voltar" variant="ghost" onPress={() => setStep(2)} testID="step3-back" style={{ flex: 1 }} />
              <Button title="Confirmar" onPress={confirm} loading={busy} testID="confirm-booking" style={{ flex: 1 }} />
            </View>
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </AppShell>
  );
}

function SummaryRow({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return (
    <View style={[styles.sumRow, !last && styles.sumRowBorder]}>
      <Text style={styles.sumKey}>{k}</Text>
      <Text style={styles.sumVal}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg },
  steps: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.xl },
  stepDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  stepDotActive: { backgroundColor: colors.brandPrimary },
  stepTitle: { fontSize: 18, fontWeight: "600", color: colors.onSurface, marginBottom: spacing.md },
  help: { fontSize: 13, color: colors.onSurfaceTertiary, marginBottom: spacing.md },
  optionCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  optionCardActive: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  optionText: { fontSize: 15, color: colors.onSurface },
  optionTextActive: { color: colors.brandPrimary, fontWeight: "600" },
  dateGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  dateCell: { width: 64, paddingVertical: spacing.sm, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, alignItems: "center", backgroundColor: colors.surfaceSecondary },
  dateCellActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  dateWd: { fontSize: 11, color: colors.onSurfaceTertiary },
  dateNum: { fontSize: 18, fontWeight: "600", color: colors.onSurface, marginVertical: 2 },
  dateMon: { fontSize: 10, color: colors.onSurfaceTertiary },
  dateActiveText: { color: colors.onBrandPrimary },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  timeCell: { width: 72, paddingVertical: spacing.md, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, alignItems: "center", backgroundColor: colors.surfaceSecondary },
  timeCellActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  timeText: { fontSize: 14, color: colors.onSurface },
  sumRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.md },
  sumRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  sumKey: { fontSize: 14, color: colors.onSurfaceTertiary },
  sumVal: { fontSize: 14, color: colors.onSurface, fontWeight: "600" },
  ruleBox: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.warning + "18", padding: spacing.md, borderRadius: radii.sm },
  ruleText: { flex: 1, fontSize: 12, color: colors.onSurfaceSecondary, lineHeight: 17 },
  err: { color: colors.error, fontSize: 14, marginTop: spacing.md },
  doneWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  doneIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", marginBottom: spacing.lg },
  doneTitle: { fontSize: 20, fontWeight: "600", color: colors.onSurface },
  doneSub: { fontSize: 14, color: colors.onSurfaceTertiary, textAlign: "center", marginTop: spacing.sm, lineHeight: 20 },
});

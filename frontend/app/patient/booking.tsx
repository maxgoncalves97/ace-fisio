import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { AppShell } from "@/src/components/AppShell";
import { Card, Button, Loading } from "@/src/components/ui";
import { useGuard } from "@/src/hooks/useGuard";
import { api, Procedure, User, ProfessionalService } from "@/src/api/client";
import { Select } from "@/src/components/Select";
import { colors, spacing, radii, areaLabel } from "@/src/theme/tokens";
import { toYMD, WEEKDAYS_SHORT, MONTHS } from "@/src/utils/format";

export default function Booking() {
  const { ready, user } = useGuard("patient");
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [area, setArea] = useState<"fisio" | "pilates" | null>(null);
  const [procedure, setProcedure] = useState("");
  const [dateYmd, setDateYmd] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [professionals, setProfessionals] = useState<Pick<User, "id" | "name" | "role">[]>([]);
  const [professionalId, setProfessionalId] = useState("");
  const [services, setServices] = useState<ProfessionalService[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => { if (ready) api.bookingProfessionals().then(setProfessionals).catch(e => setErr(e.message)); }, [ready]);
  useEffect(() => { if (ready) api.listProfessionalServices().then(setServices).catch(e => setErr(e.message)); }, [ready]);
  useEffect(() => {
    let active = true;
    setTime(""); setSlots([]);
    setSlotsLoading(false);
    if (!professionalId || !dateYmd) return;
    setSlotsLoading(true);
    api.bookingSlots(professionalId, dateYmd, serviceId || undefined).then(s => { if (active) setSlots(s); })
      .catch(e => { if (active) setErr(e.message); }).finally(() => { if (active) setSlotsLoading(false); });
    return () => { active = false; };
  }, [professionalId, dateYmd, serviceId]);

  useEffect(() => {
    (async () => {
      if (!user?.patient_id) return;
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
  const relevantProfessionals = professionals.filter(p => {
    const offered = services.filter(s => s.professional_id === p.id);
    return offered.length ? offered.some(s => s.area === area || s.area === "ambos") : p.role === (area === "pilates" ? "admin_pilates" : "admin_fisio");
  });
  const relevantServices = services.filter(s => s.professional_id === professionalId && (s.area === area || s.area === "ambos"));
  const chooseArea = (value: "fisio" | "pilates") => {
    setArea(value); setProcedure(""); setProfessionalId(""); setServiceId("");
    setDateYmd(""); setTime(""); setSlots([]); setErr(null);
  };

  const confirm = async () => {
    setBusy(true); setErr(null);
    try {
      await api.createAppointment({ patient_id: user!.patient_id, professional_id: professionalId, service_id: serviceId || null, area, procedure, date: dateYmd, time, duration_min: 60 });
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
    <AppShell role="patient" active="booking" title="Agendar atendimento" subtitle={`Passo ${step + 1} de 4`}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.steps}>
          {[0, 1, 2, 3].map((s) => (
            <View key={s} style={[styles.stepDot, step >= s && styles.stepDotActive]} />
          ))}
        </View>

        {step === 0 && (
          <View>
            <Text style={styles.stepTitle}>O que você deseja agendar?</Text>
            <Text style={styles.help}>Escolha o tipo de atendimento para ver as opções disponíveis.</Text>
            {([['fisio', 'Fisioterapia', 'Avaliação, reabilitação e sessões de fisioterapia.'], ['pilates', 'Aula de Pilates', 'Aulas e avaliações de Pilates.']] as const).map(([value, label, description]) => (
              <Pressable key={value} testID={`book-area-${value}`} accessibilityRole="radio" accessibilityState={{ checked: area === value }} onPress={() => chooseArea(value)}>
                <Card style={[styles.optionCard, area === value && styles.optionCardActive]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionText, area === value && styles.optionTextActive]}>{label}</Text>
                    <Text style={{ color: colors.onSurfaceTertiary, marginTop: spacing.xs }}>{description}</Text>
                  </View>
                  <Feather name={area === value ? "check-circle" : "circle"} size={22} color={colors.brandPrimary} />
                </Card>
              </Pressable>
            ))}
            <Button title="Continuar" disabled={!area} onPress={() => setStep(1)} testID="book-type-next" style={{ marginTop: spacing.lg }} />
          </View>
        )}

        {step === 1 && area && (
          <View>
            <Text style={styles.stepTitle}>Serviço</Text>
            <Text style={styles.help}>Selecione o procedimento em {areaLabel[area]}:</Text>
            {procOptions.map((p) => (
              <Pressable key={p.id} testID={`book-proc-${p.id}`} onPress={() => { setProcedure(p.name); setServiceId(""); }}>
                <Card style={[styles.optionCard, procedure === p.name && styles.optionCardActive]}>
                  <Text style={[styles.optionText, procedure === p.name && styles.optionTextActive]}>{p.name}</Text>
                  {procedure === p.name && <Feather name="check" size={18} color={colors.brandPrimary} />}
                </Card>
              </Pressable>
            ))}
            <Select title="Profissional" testID="book-professional" placeholder="Selecione o profissional" value={professionalId} onChange={id => { setProfessionalId(id); if (serviceId) setProcedure(""); setServiceId(""); setDateYmd(""); setTime(""); }}
              options={relevantProfessionals.map(p => ({ label: p.name, value: p.id }))} />
            {relevantProfessionals.length === 0 && <Text style={styles.help}>Nenhum profissional disponível para este tipo de atendimento.</Text>}
            {relevantServices.length > 0 && <Select title="Serviço e preço" testID="book-service" placeholder="Selecione o serviço" value={serviceId}
              options={relevantServices.map(s => ({ label: `${s.name} · ${s.duration_min} min · R$ ${(s.price_cents / 100).toFixed(2)}`, value: s.id }))}
              onChange={id => { setServiceId(id); const s = services.find(s => s.id === id); if (s) setProcedure(s.name); }} />}
            {err ? <Text style={styles.err}>{err}</Text> : null}
            <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.lg }}>
              <Button title="Voltar" variant="ghost" onPress={() => setStep(0)} testID="book-service-back" style={{ flex: 1 }} />
              <Button title="Continuar" onPress={() => setStep(2)} disabled={!procedure || !professionalId || (relevantServices.length > 0 && !serviceId)} testID="step1-next" style={{ flex: 1 }} />
            </View>
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
            {slotsLoading ? <Loading /> : dateYmd && slots.length === 0 ? <Text style={styles.help}>Nenhum horário disponível nesta data.</Text> : null}
            <View style={styles.timeGrid}>
              {slots.map((t) => {
                const active = t === time;
                return (
                  <Pressable key={t} testID={`book-time-${t}`} onPress={() => setTime(t)} style={[styles.timeCell, active && styles.timeCellActive]}>
                    <Text style={[styles.timeText, active && styles.dateActiveText]}>{t}</Text>
                  </Pressable>
                );
              })}
            </View>
            {err ? <Text style={styles.err}>{err}</Text> : null}
            <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.lg }}>
              <Button title="Voltar" variant="ghost" onPress={() => setStep(1)} testID="step2-back" style={{ flex: 1 }} />
              <Button title="Continuar" onPress={() => setStep(3)} disabled={!dateYmd || !time} testID="step2-next" style={{ flex: 1 }} />
            </View>
          </View>
        )}

        {step === 3 && area && (
          <View>
            <Text style={styles.stepTitle}>Confirmar</Text>
            <Card style={{ marginBottom: spacing.lg }}>
              <SummaryRow k="Serviço" v={areaLabel[area]} />
              <SummaryRow k="Procedimento" v={procedure} />
              <SummaryRow k="Profissional" v={professionals.find(p => p.id === professionalId)?.name || ""} />
              {serviceId && <SummaryRow k="Valor" v={((services.find(s => s.id === serviceId)?.price_cents || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />}
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

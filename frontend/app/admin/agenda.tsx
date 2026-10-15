import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";

import { AppShell } from "@/src/components/AppShell";
import { Button, Card, Chip, ChipRow, Field, TextArea, StatusBadge, EmptyState, Loading } from "@/src/components/ui";
import { FormModal } from "@/src/components/FormModal";
import { Select } from "@/src/components/Select";
import { useGuard } from "@/src/hooks/useGuard";
import { api, Appointment, Patient, Procedure, User, ProfessionalService } from "@/src/api/client";
import { colors, spacing, radii, statusColors, areaLabel } from "@/src/theme/tokens";
import { fmtTime, toYMD, WEEKDAYS_SHORT, MONTHS } from "@/src/utils/format";

type ViewMode = "dia" | "semana" | "mes";

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setDate(d.getDate() - d.getDay());
  x.setHours(0, 0, 0, 0);
  return x;
}

const TIME_SLOTS = (() => {
  const out: string[] = [];
  for (let h = 7; h <= 20; h++) {
    out.push(`${String(h).padStart(2, "0")}:00`);
    if (h < 20) out.push(`${String(h).padStart(2, "0")}:30`);
  }
  return out;
})();

export default function Agenda() {
  const { ready, user } = useGuard("admin");
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 900;

  const [mode, setMode] = useState<ViewMode>("dia");
  const [area, setArea] = useState<string>("todos");
  const [selected, setSelected] = useState<Date>(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [actionAppt, setActionAppt] = useState<Appointment | null>(null);
  const [actionError, setActionError] = useState("");

  const range = useMemo(() => {
    if (mode === "dia") {
      const ymd = toYMD(selected);
      return { date: ymd };
    }
    if (mode === "semana") {
      const s = startOfWeek(selected);
      const e = new Date(s); e.setDate(s.getDate() + 6);
      return { date_from: toYMD(s), date_to: toYMD(e) };
    }
    const s = new Date(selected.getFullYear(), selected.getMonth(), 1);
    const e = new Date(selected.getFullYear(), selected.getMonth() + 1, 0);
    return { date_from: toYMD(s), date_to: toYMD(e) };
  }, [mode, selected]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.listAppointments({ ...range, area });
      setAppts(list);
    } catch {
      setAppts([]);
    } finally {
      setLoading(false);
    }
  }, [range, area]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const shift = (delta: number) => {
    const d = new Date(selected);
    if (mode === "dia") d.setDate(d.getDate() + delta);
    else if (mode === "semana") d.setDate(d.getDate() + delta * 7);
    else d.setMonth(d.getMonth() + delta);
    setSelected(d);
  };

  const headerLabel = useMemo(() => {
    if (mode === "dia") return `${WEEKDAYS_SHORT[selected.getDay()]}, ${selected.getDate()} de ${MONTHS[selected.getMonth()]}`;
    if (mode === "semana") {
      const s = startOfWeek(selected);
      const e = new Date(s); e.setDate(s.getDate() + 6);
      return `${s.getDate()}/${s.getMonth() + 1} – ${e.getDate()}/${e.getMonth() + 1}`;
    }
    return `${MONTHS[selected.getMonth()]} ${selected.getFullYear()}`;
  }, [mode, selected]);

  const setStatus = async (id: string, status: any) => {
    try {
      await api.setApptStatus(id, status);
      setActionAppt(null);
      load();
    } catch {}
  };

  const cancelAppt = async (id: string) => {
    try {
      await api.cancelAppointment(id);
      setActionAppt(null);
      load();
    } catch {}
  };

  if (!ready) return <Loading />;

  return (
    <AppShell
      role="admin"
      active="agenda"
      title="Agenda"
      subtitle={headerLabel}
      headerRight={
        wide ? <Button title="Novo agendamento" icon="plus" onPress={() => setCreateOpen(true)} testID="new-appt-button" style={{ width: 200 }} /> : undefined
      }
    >
      <View style={styles.controls}>
        <ChipRow>
          {(["dia", "semana", "mes"] as ViewMode[]).map((m) => (
            <Chip key={m} testID={`view-${m}`} label={m === "dia" ? "Dia" : m === "semana" ? "Semana" : "Mês"} active={mode === m} onPress={() => setMode(m)} />
          ))}
        </ChipRow>
        <View style={styles.navRow}>
          <Pressable testID="agenda-prev" onPress={() => shift(-1)} style={styles.navBtn}><Feather name="chevron-left" size={20} color={colors.onSurface} /></Pressable>
          <Pressable testID="agenda-today" onPress={() => { const d = new Date(); d.setHours(0, 0, 0, 0); setSelected(d); }} style={styles.todayBtn}>
            <Text style={styles.todayText}>Hoje</Text>
          </Pressable>
          <Pressable testID="agenda-next" onPress={() => shift(1)} style={styles.navBtn}><Feather name="chevron-right" size={20} color={colors.onSurface} /></Pressable>
        </View>
      </View>

      <View style={styles.areaChips}>
        <ChipRow>
          {["todos", "fisio", "pilates"].map((a) => (
            <Chip key={a} testID={`agenda-area-${a}`} label={a === "todos" ? "Todos" : areaLabel[a]} active={area === a} onPress={() => setArea(a)} />
          ))}
        </ChipRow>
      </View>

      {loading ? (
        <Loading />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {mode === "mes" ? (
            <MonthGrid selected={selected} appts={appts} onPick={(d) => { setSelected(d); setMode("dia"); }} />
          ) : mode === "semana" ? (
            <WeekList selected={selected} appts={appts} onAppt={setActionAppt} />
          ) : appts.length === 0 ? (
            <EmptyState icon="calendar" title="Nenhum atendimento" subtitle="Toque em + para criar um novo agendamento." />
          ) : (
            appts.map((a) => <ApptCard key={a.id} appt={a} onPress={() => setActionAppt(a)} />)
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {!wide && (
        <Pressable testID="new-appt-fab" onPress={() => setCreateOpen(true)} style={styles.fab}>
          <Feather name="plus" size={26} color={colors.onBrandPrimary} />
        </Pressable>
      )}

      <NewAppointmentModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { setCreateOpen(false); load(); }}
        defaultDate={selected}
        currentUser={user}
      />

      <FormModal visible={!!actionAppt} onClose={() => setActionAppt(null)} title={actionAppt?.patient_name ?? ""} testID="appt-actions">
        {actionAppt && (
          <View style={{ gap: spacing.sm }}>
            <Text style={styles.actionMeta}>
              {actionAppt.procedure || areaLabel[actionAppt.area]} · {fmtTime(actionAppt.datetime)} · {actionAppt.duration_min}min
            </Text>
            <Text style={styles.actionMeta}>Profissional: {actionAppt.professional_name || "—"}</Text>
            <View style={{ height: spacing.sm }} />
            <Button title="Confirmar presença" icon="check-circle" onPress={() => setStatus(actionAppt.id, "presente")} testID="action-presente" />
            <Button title="Confirmar" icon="check" variant="secondary" onPress={() => setStatus(actionAppt.id, "confirmado")} testID="action-confirmado" />
            <Button title="Marcar falta" icon="user-x" variant="secondary" onPress={() => setStatus(actionAppt.id, "faltou")} testID="action-faltou" />
            <Button title="Ver paciente" icon="user" variant="ghost" onPress={() => { const pid = actionAppt.patient_id; setActionAppt(null); router.push(`/admin/patient/${pid}`); }} testID="action-view-patient" />
            <Button title="Cancelar atendimento" icon="x-circle" variant="danger" onPress={() => cancelAppt(actionAppt.id)} testID="action-cancel" />
            {actionAppt.series_id && <Button title="Cancelar próximas sessões da série" variant="danger" testID="cancel-series" onPress={async () => {
              try { await api.cancelFutureSeries(actionAppt.series_id!); setActionAppt(null); setActionError(""); load(); }
              catch (e: any) { setActionError(e.message); }
            }} />}
            {actionError ? <Text style={styles.err}>{actionError}</Text> : null}
          </View>
        )}
      </FormModal>
    </AppShell>
  );
}

function ApptCard({ appt, onPress }: { appt: Appointment; onPress: () => void }) {
  const sc = statusColors[appt.status];
  return (
    <Pressable testID={`appt-${appt.id}`} onPress={onPress}>
      <Card style={styles.apptCard}>
        <View style={[styles.timeCol, { borderLeftColor: sc.fg }]}>
          <Text style={styles.timeText}>{fmtTime(appt.datetime)}</Text>
          <Text style={styles.durText}>{appt.duration_min}min</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.apptName} numberOfLines={1}>{appt.patient_name}</Text>
          <Text style={styles.apptMeta} numberOfLines={1}>{appt.procedure || areaLabel[appt.area]} · {areaLabel[appt.area]}</Text>
          {appt.professional_name ? <Text style={styles.apptProf} numberOfLines={1}>{appt.professional_name}</Text> : null}
          {appt.series_id ? <Text style={styles.apptProf}>Repetição semanal</Text> : null}
        </View>
        <StatusBadge label={sc.label} bg={sc.bg} fg={sc.fg} />
      </Card>
    </Pressable>
  );
}

function WeekList({ selected, appts, onAppt }: { selected: Date; appts: Appointment[]; onAppt: (a: Appointment) => void }) {
  const s = startOfWeek(selected);
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(s); d.setDate(s.getDate() + i); return d; });
  return (
    <View style={{ gap: spacing.md }}>
      {days.map((d) => {
        const ymd = toYMD(d);
        const dayAppts = appts.filter((a) => a.date === ymd);
        return (
          <View key={ymd}>
            <Text style={styles.weekDayHeader}>{WEEKDAYS_SHORT[d.getDay()]}, {d.getDate()}/{d.getMonth() + 1}</Text>
            {dayAppts.length === 0 ? (
              <Text style={styles.weekEmpty}>Sem atendimentos</Text>
            ) : (
              dayAppts.map((a) => <ApptCard key={a.id} appt={a} onPress={() => onAppt(a)} />)
            )}
          </View>
        );
      })}
    </View>
  );
}

function MonthGrid({ selected, appts, onPick }: { selected: Date; appts: Appointment[]; onPick: (d: Date) => void }) {
  const first = new Date(selected.getFullYear(), selected.getMonth(), 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(selected.getFullYear(), selected.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(selected.getFullYear(), selected.getMonth(), d));
  const countByYmd: Record<string, number> = {};
  appts.forEach((a) => { countByYmd[a.date] = (countByYmd[a.date] || 0) + 1; });
  const todayYmd = toYMD(new Date());

  return (
    <View style={styles.monthWrap}>
      <View style={styles.monthHeaderRow}>
        {WEEKDAYS_SHORT.map((w) => <Text key={w} style={styles.monthHeaderCell}>{w}</Text>)}
      </View>
      <View style={styles.monthGrid}>
        {cells.map((c, i) => {
          if (!c) return <View key={`e${i}`} style={styles.monthCell} />;
          const ymd = toYMD(c);
          const count = countByYmd[ymd] || 0;
          const isToday = ymd === todayYmd;
          return (
            <Pressable key={ymd} testID={`month-day-${ymd}`} onPress={() => onPick(c)} style={[styles.monthCell, isToday && styles.monthCellToday]}>
              <Text style={[styles.monthCellNum, isToday && styles.monthCellNumToday]}>{c.getDate()}</Text>
              {count > 0 && (
                <View style={styles.monthBadge}>
                  <Text style={styles.monthBadgeText}>{count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function NewAppointmentModal({
  visible, onClose, onCreated, defaultDate, currentUser,
}: {
  visible: boolean; onClose: () => void; onCreated: () => void; defaultDate: Date; currentUser: User | null;
}) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [professionals, setProfessionals] = useState<User[]>([]);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [area, setArea] = useState<"fisio" | "pilates">("fisio");
  const [procedure, setProcedure] = useState<string>("");
  const [dateYmd, setDateYmd] = useState<string>(toYMD(defaultDate));
  const [time, setTime] = useState<string>("09:00");
  const [duration, setDuration] = useState<string>("60");
  const [profId, setProfId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [occurrences, setOccurrences] = useState("1");
  const [services, setServices] = useState<ProfessionalService[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setDateYmd(toYMD(defaultDate));
    setErr(null);
    api.listProfessionalServices().then(setServices).catch(e => setErr(e.message));
    (async () => {
      try {
        const [ps, pr, prof] = await Promise.all([api.listPatients(), api.listProcedures(), api.listProfessionals()]);
        setPatients(ps);
        setProcedures(pr);
        setProfessionals(prof);
        if (currentUser) setProfId(currentUser.id);
      } catch {}
    })();
  }, [visible, defaultDate, currentUser]);

  const dateOptions = useMemo(() => {
    const out = [];
    const base = new Date(); base.setHours(0, 0, 0, 0);
    for (let i = 0; i < 60; i++) {
      const d = new Date(base); d.setDate(base.getDate() + i);
      out.push({ value: toYMD(d), label: `${WEEKDAYS_SHORT[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}` });
    }
    return out;
  }, []);

  const submit = async () => {
    if (!patientId) { setErr("Selecione um paciente"); return; }
    setBusy(true);
    setErr(null);
    try {
      const body = {
        patient_id: patientId, area, procedure, date: dateYmd, time,
        duration_min: parseInt(duration, 10), professional_id: profId, notes,
        service_id: serviceId || null,
      };
      if (occurrences === "1") await api.createAppointment(body);
      else await api.createAppointmentSeries({ ...body, occurrences: Number(occurrences) });
      // reset
      setPatientId(null); setProcedure(""); setNotes(""); setOccurrences("1"); setServiceId("");
      onCreated();
    } catch (e: any) {
      setErr(e?.message ?? "Erro ao criar agendamento");
    } finally {
      setBusy(false);
    }
  };

  const procOptions = procedures.filter((p) => p.area === area || p.area === "ambos").map((p) => ({ label: p.name, value: p.name }));

  return (
    <FormModal
      visible={visible}
      onClose={onClose}
      title="Novo agendamento"
      testID="new-appt-modal"
      footer={<Button title={occurrences === "1" ? "Criar agendamento" : `Criar ${occurrences} sessões`} onPress={submit} loading={busy} testID="submit-appt" />}
    >
      <Field label="Paciente">
        <Select
          testID="appt-patient-select"
          title="Selecionar paciente"
          placeholder="Selecione o paciente"
          value={patientId}
          options={patients.map((p) => ({ label: p.name, value: p.id }))}
          onChange={setPatientId}
        />
      </Field>
      <Field label="Área">
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Chip label="Fisioterapia" active={area === "fisio"} onPress={() => setArea("fisio")} testID="appt-area-fisio" />
          <Chip label="Pilates" active={area === "pilates"} onPress={() => setArea("pilates")} testID="appt-area-pilates" />
        </View>
      </Field>
      <Field label="Procedimento">
        <Select testID="appt-procedure-select" title="Procedimento" placeholder="Selecione" value={procedure} options={procOptions} onChange={setProcedure} />
      </Field>
      <Field label="Profissional">
        <Select
          testID="appt-prof-select"
          title="Profissional"
          placeholder="Selecione"
          value={profId}
          options={professionals.map((p) => ({ label: p.name || p.email, value: p.id }))}
          onChange={id => { setProfId(id); setServiceId(""); }}
        />
      </Field>
      {services.some(s => s.professional_id === profId) && <Field label="Serviço e preço do profissional">
        <Select title="Serviço" testID="appt-service-select" value={serviceId} placeholder="Opcional: usar procedimento acima"
          options={[{ label: "Usar procedimento acima", value: "" }, ...services.filter(s => s.professional_id === profId).map(s => ({ label: `${s.name} · ${s.duration_min} min · R$ ${(s.price_cents / 100).toFixed(2)}`, value: s.id }))]}
          onChange={id => { setServiceId(id); const s = services.find(s => s.id === id); if (s) { setProcedure(s.name); setDuration(String(s.duration_min)); } }} />
      </Field>}
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Field label="Data">
            <Select testID="appt-date-select" title="Data" value={dateYmd} options={dateOptions} onChange={setDateYmd} />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Horário">
            <Select testID="appt-time-select" title="Horário" value={time} options={TIME_SLOTS.map((t) => ({ label: t, value: t }))} onChange={setTime} />
          </Field>
        </View>
      </View>
      <Field label="Duração">
        <Select testID="appt-duration-select" title="Duração" value={duration} options={[{ label: "30 min", value: "30" }, { label: "45 min", value: "45" }, { label: "60 min", value: "60" }, { label: "90 min", value: "90" }]} onChange={setDuration} />
      </Field>
      <Field label="Observações">
        <TextArea testID="appt-notes-input" value={notes} onChangeText={setNotes} placeholder="Opcional" />
      </Field>
      <Field label="Repetição">
        <Select testID="appt-repeat-select" title="Repetição semanal" value={occurrences} onChange={setOccurrences}
          options={[{ label: "Não repetir", value: "1" }, ...[2, 4, 6, 8, 10, 12, 24, 52].map(n => ({ label: `${n} sessões semanais`, value: String(n) }))]} />
      </Field>
      {occurrences !== "1" && <Text style={styles.actionMeta}>Uma sessão por semana, no mesmo dia e horário. Se houver conflito em qualquer data, nenhuma sessão será criada.</Text>}
      {err ? <Text style={styles.err}>{err}</Text> : null}
    </FormModal>
  );
}

const styles = StyleSheet.create({
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.md, gap: spacing.md },
  navRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingRight: spacing.lg },
  navBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  todayBtn: { paddingHorizontal: spacing.md, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: colors.brandTertiary },
  todayText: { color: colors.brandPrimary, fontWeight: "600", fontSize: 13 },
  areaChips: { paddingBottom: spacing.md },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
  apptCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.sm },
  timeCol: { borderLeftWidth: 3, paddingLeft: spacing.md, width: 76 },
  timeText: { fontSize: 16, fontWeight: "600", color: colors.onSurface },
  durText: { fontSize: 11, color: colors.onSurfaceTertiary, marginTop: 2 },
  apptName: { fontSize: 15, fontWeight: "500", color: colors.onSurface },
  apptMeta: { fontSize: 12, color: colors.onSurfaceTertiary, marginTop: 2 },
  apptProf: { fontSize: 11, color: colors.onSurfaceTertiary, marginTop: 1 },
  fab: {
    position: "absolute", right: spacing.lg, bottom: spacing.xl,
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brandPrimary,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
  actionMeta: { fontSize: 14, color: colors.onSurfaceSecondary },
  err: { color: colors.error, fontSize: 14, marginTop: spacing.sm },
  weekDayHeader: { fontSize: 13, fontWeight: "600", color: colors.onSurfaceTertiary, marginBottom: spacing.sm, textTransform: "uppercase", letterSpacing: 0.5 },
  weekEmpty: { fontSize: 13, color: colors.onSurfaceTertiary, marginBottom: spacing.md, fontStyle: "italic" },
  // month
  monthWrap: { backgroundColor: colors.surfaceSecondary, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.sm },
  monthHeaderRow: { flexDirection: "row", paddingVertical: spacing.sm },
  monthHeaderCell: { flex: 1, textAlign: "center", fontSize: 11, color: colors.onSurfaceTertiary, fontWeight: "600" },
  monthGrid: { flexDirection: "row", flexWrap: "wrap" },
  monthCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center", padding: 2 },
  monthCellToday: {},
  monthCellNum: { fontSize: 14, color: colors.onSurface },
  monthCellNumToday: { color: colors.brandPrimary, fontWeight: "700" },
  monthBadge: { marginTop: 2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  monthBadgeText: { color: colors.onBrandPrimary, fontSize: 10, fontWeight: "600" },
});

import { useEffect, useState } from "react";
import { Text, View, Switch } from "react-native";
import { api, Availability, User } from "@/src/api/client";
import { Button, Card, Field, Input } from "./ui";
import { Select } from "./Select";
import { colors, spacing } from "@/src/theme/tokens";

const DEFAULT: Availability = { weekdays: [0, 1, 2, 3, 4], start: "08:00", end: "18:00", booking_enabled: true, day_overrides: {} };
const DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

export function BookingAvailabilitySettings({ ownId }: { ownId?: string }) {
  const [professionals, setProfessionals] = useState<User[]>([]);
  const [target, setTarget] = useState(ownId || "");
  const [schedule, setSchedule] = useState<Availability>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [loadedTarget, setLoadedTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { api.listProfessionals().then(setProfessionals).catch(e => setMessage(e.message)); }, []);
  useEffect(() => { if (ownId) setTarget(ownId); }, [ownId]);
  useEffect(() => {
    if (!target) return;
    let active = true;
    setLoading(true); setLoadedTarget(""); setMessage("");
    api.getAvailability(target === ownId ? undefined : target).then(value => { if (active) { setSchedule(value); setLoadedTarget(target); } })
      .catch(e => { if (active) setMessage(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [target, ownId]);
  const windows = (day: number) => schedule.day_overrides?.[String(day)] ?? (schedule.weekdays.includes(day) ? [{ start: schedule.start, end: schedule.end }] : []);
  const changeDay = (day: number, periods: {start: string; end: string}[]) => setSchedule(s => ({ ...s, day_overrides: { ...s.day_overrides, [String(day)]: periods } }));
  const save = async () => {
    setBusy(true); setMessage("");
    try { setSchedule(await api.saveAvailability(schedule, target === ownId ? undefined : target)); setMessage("Salvo com sucesso."); }
    catch (e: any) { setMessage(e.message); } finally { setBusy(false); }
  };
  return <Card style={{ marginBottom: spacing.lg, gap: spacing.md }}>
    <Text style={{ fontSize: 17, fontWeight: "600", color: colors.onSurface }}>Profissionais e disponibilidade online</Text>
    <Text style={{ color: colors.onSurfaceSecondary }}>Escolha um profissional da clínica para configurar sua agenda. Horários de São Paulo. Alterações valem para novos agendamentos; atendimentos já marcados são mantidos.</Text>
    <View pointerEvents={busy ? "none" : "auto"}>
      <Select popup title="Configurar profissional" testID="availability-professional" value={target} onChange={setTarget} options={professionals.map(p => ({ label: p.name, value: p.id }))} />
    </View>
    {loading || loadedTarget !== target ? <Text>{loading ? "Carregando horários…" : "Não foi possível carregar esta agenda. Selecione o profissional novamente."}</Text> : <View pointerEvents={busy ? "none" : "auto"} style={{ gap: spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <Text style={{ flex: 1, color: colors.onSurface }}>Permitir que pacientes selecionem este profissional</Text>
        <Switch testID="booking-enabled" accessibilityLabel="Disponível para agendamento online" value={schedule.booking_enabled !== false} onValueChange={booking_enabled => setSchedule(s => ({ ...s, booking_enabled }))} trackColor={{ true: colors.brandPrimary }} />
      </View>
      <Text style={{ color: colors.onSurfaceSecondary }}>Padrão semanal: usado nos dias de atendimento sem períodos personalizados abaixo.</Text>
      <Field label="Início padrão (HH:mm)"><Input testID="availability-start" value={schedule.start} onChangeText={start => setSchedule(s => ({ ...s, start }))} /></Field>
      <Field label="Fim padrão (HH:mm)"><Input testID="availability-end" value={schedule.end} onChangeText={end => setSchedule(s => ({ ...s, end }))} /></Field>
      {DAYS.map((label, day) => <View key={day} style={{ gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <Text style={{ flex: 1, fontWeight: "600", color: colors.onSurface }}>{label}</Text>
          <Switch testID={`availability-day-${day}`} accessibilityLabel={`${label}: atende neste dia`} value={windows(day).length > 0} onValueChange={enabled => changeDay(day, enabled ? [{ start: schedule.start, end: schedule.end }] : [])} trackColor={{ true: colors.brandPrimary }} />
        </View>
        {windows(day).length === 0 && <Text style={{ color: colors.onSurfaceTertiary }}>Sem atendimento</Text>}
        {windows(day).map((period, index) => <View key={index} style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <View style={{ flex: 1 }}><Field label="Das"><Input accessibilityLabel={`${label}, início do período ${index + 1}`} testID={`availability-day-${day}-start-${index}`} value={period.start} onChangeText={start => changeDay(day, windows(day).map((w, i) => i === index ? { ...w, start } : w))} /></Field></View>
            <View style={{ flex: 1 }}><Field label="Até"><Input accessibilityLabel={`${label}, fim do período ${index + 1}`} testID={`availability-day-${day}-end-${index}`} value={period.end} onChangeText={end => changeDay(day, windows(day).map((w, i) => i === index ? { ...w, end } : w))} /></Field></View>
          </View>
          <Button variant="ghost" title="Remover período" testID={`availability-day-${day}-remove-${index}`} onPress={() => changeDay(day, windows(day).filter((_, i) => i !== index))} />
        </View>)}
        {windows(day).length > 0 && <Button variant="ghost" title="Adicionar período" disabled={windows(day).length >= 4} testID={`availability-day-${day}-add`} onPress={() => changeDay(day, [...windows(day), { start: "13:00", end: "18:00" }])} />}
      </View>)}
      <Text style={{ color: colors.onSurfaceSecondary }}>Exemplo: sexta das 08:00 às 15:00. Uma sessão de 60 minutos poderá começar até 14:00. Para intervalos, use períodos como 08:00–12:00 e 13:00–18:00.</Text>
      <Button title="Salvar horários e disponibilidade" testID="save-availability" loading={busy} onPress={save} />
    </View>}
    {message ? <Text accessibilityLiveRegion="polite" style={{ color: colors.onSurfaceSecondary }}>{message}</Text> : null}
  </Card>;
}

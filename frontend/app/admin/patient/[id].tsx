import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  Button, Card, Chip, Field, Input, TextArea, Avatar, StatusBadge, EmptyState, Loading, SectionTitle,
} from "@/src/components/ui";
import { FormModal } from "@/src/components/FormModal";
import { Select } from "@/src/components/Select";
import { ProgressChart } from "@/src/components/ProgressChart";
import { useGuard } from "@/src/hooks/useGuard";
import { api, Patient, Assessment, Evolution, Exercise, Payment, Appointment } from "@/src/api/client";
import { colors, spacing, radii, statusColors, payStatusColors, areaLabel } from "@/src/theme/tokens";
import { fmtBRL, fmtDate, fmtDateTime, ageFrom } from "@/src/utils/format";

const TABS = [
  { key: "dados", label: "Dados" },
  { key: "anamnese", label: "Anamnese" },
  { key: "evolucoes", label: "Evoluções" },
  { key: "avaliacoes", label: "Avaliações" },
  { key: "exercicios", label: "Exercícios" },
  { key: "orientacoes", label: "Orientações" },
  { key: "pagamentos", label: "Pagamentos" },
  { key: "presenca", label: "Presença" },
];

export default function PatientDetail() {
  const { ready } = useGuard("admin");
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [tab, setTab] = useState("dados");
  const [loading, setLoading] = useState(true);

  const loadPatient = useCallback(async () => {
    if (!id) return;
    try {
      const p = await api.getPatient(id);
      setPatient(p);
    } catch {}
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadPatient(); }, [loadPatient]);

  if (!ready) return <Loading />;

  return (
    <SafeAreaView style={styles.root} edges={["top"]} testID="patient-detail-screen">
      <View style={styles.header}>
        <Pressable testID="back-button" onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>Ficha do paciente</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading || !patient ? (
        <Loading />
      ) : (
        <>
          <View style={styles.patientHead}>
            <Avatar name={patient.name} size={56} />
            <View style={{ flex: 1 }}>
              <Text style={styles.pName} numberOfLines={1}>{patient.name}</Text>
              <Text style={styles.pMeta}>{[areaLabel[patient.area], ageFrom(patient.birth_date)].filter(Boolean).join(" · ")}</Text>
            </View>
          </View>

          <View style={styles.tabBarWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
              {TABS.map((t) => (
                <Pressable key={t.key} testID={`tab-${t.key}`} onPress={() => setTab(t.key)} style={[styles.tabItem, tab === t.key && styles.tabItemActive]}>
                  <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={{ flex: 1 }}>
            {tab === "dados" && <DadosTab patient={patient} />}
            {tab === "anamnese" && <AnamneseTab pid={patient.id} />}
            {tab === "evolucoes" && <EvolucoesTab pid={patient.id} area={patient.area} />}
            {tab === "avaliacoes" && <AvaliacoesTab pid={patient.id} />}
            {tab === "exercicios" && <ExerciciosTab pid={patient.id} />}
            {tab === "orientacoes" && <OrientacoesTab pid={patient.id} />}
            {tab === "pagamentos" && <PagamentosTab pid={patient.id} area={patient.area} />}
            {tab === "presenca" && <PresencaTab pid={patient.id} />}
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

// ---------- Dados ----------
function DadosTab({ patient }: { patient: Patient }) {
  const rows = [
    ["Nome", patient.name],
    ["Nascimento", patient.birth_date ? fmtDate(patient.birth_date) : "—"],
    ["Telefone", patient.phone || "—"],
    ["WhatsApp", patient.whatsapp || "—"],
    ["Email", patient.email || "—"],
    ["CPF", patient.cpf || "—"],
    ["Endereço", patient.address || "—"],
    ["Contato emergência", patient.emergency_contact || "—"],
    ["Área", areaLabel[patient.area]],
    ["Cadastro", fmtDate(patient.created_at)],
  ];
  return (
    <ScrollView contentContainerStyle={styles.tabScroll}>
      <Card>
        {rows.map(([k, v], i) => (
          <View key={k} style={[styles.dataRow, i < rows.length - 1 && styles.dataRowBorder]}>
            <Text style={styles.dataKey}>{k}</Text>
            <Text style={styles.dataVal} numberOfLines={2}>{v}</Text>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

// ---------- Anamnese ----------
function AnamneseTab({ pid }: { pid: string }) {
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { api.getAnamnese(pid).then(setData).catch(() => setData({})); }, [pid]);

  const upd = (k: string, v: any) => setData((d: any) => ({ ...d, [k]: v }));

  const save = async () => {
    setBusy(true); setSaved(false);
    try {
      await api.saveAnamnese(pid, {
        queixa_principal: data.queixa_principal || "", tempo_queixa: data.tempo_queixa || "",
        tratamento_anterior: !!data.tratamento_anterior, qual_tratamento: data.qual_tratamento || "",
        exames: data.exames || "", diagnostico: data.diagnostico || "", condicao_medica: data.condicao_medica || "",
        cirurgias: data.cirurgias || "", medicamentos: data.medicamentos || "", observacoes: data.observacoes || "",
      });
      setSaved(true);
    } catch {}
    finally { setBusy(false); }
  };

  if (!data) return <Loading />;

  return (
    <ScrollView contentContainerStyle={styles.tabScroll} keyboardShouldPersistTaps="handled">
      <Field label="Queixa principal"><TextArea testID="anamnese-queixa" value={data.queixa_principal} onChangeText={(v) => upd("queixa_principal", v)} placeholder="Descreva a queixa" /></Field>
      <Field label="Há quanto tempo apresenta a queixa"><Input testID="anamnese-tempo" value={data.tempo_queixa} onChangeText={(v) => upd("tempo_queixa", v)} placeholder="Ex.: 3 semanas" /></Field>
      <Pressable testID="anamnese-tratamento-toggle" onPress={() => upd("tratamento_anterior", !data.tratamento_anterior)} style={styles.checkRow}>
        <View style={[styles.checkbox, data.tratamento_anterior && styles.checkboxOn]}>{data.tratamento_anterior && <Feather name="check" size={14} color={colors.onBrandPrimary} />}</View>
        <Text style={styles.checkLabel}>Já realizou tratamento anteriormente</Text>
      </Pressable>
      {data.tratamento_anterior && <Field label="Qual tratamento?"><Input testID="anamnese-qual" value={data.qual_tratamento} onChangeText={(v) => upd("qual_tratamento", v)} /></Field>}
      <Field label="Possui exames?"><TextArea testID="anamnese-exames" value={data.exames} onChangeText={(v) => upd("exames", v)} /></Field>
      <Field label="Diagnóstico médico"><Input testID="anamnese-diag" value={data.diagnostico} onChangeText={(v) => upd("diagnostico", v)} /></Field>
      <Field label="Condição médica relevante"><Input testID="anamnese-condicao" value={data.condicao_medica} onChangeText={(v) => upd("condicao_medica", v)} /></Field>
      <Field label="Cirurgias anteriores"><Input testID="anamnese-cirurgias" value={data.cirurgias} onChangeText={(v) => upd("cirurgias", v)} /></Field>
      <Field label="Medicamentos relevantes"><Input testID="anamnese-medicamentos" value={data.medicamentos} onChangeText={(v) => upd("medicamentos", v)} /></Field>
      <Field label="Observações adicionais"><TextArea testID="anamnese-obs" value={data.observacoes} onChangeText={(v) => upd("observacoes", v)} /></Field>
      {saved ? <Text style={styles.savedMsg}>Anamnese salva com sucesso.</Text> : null}
      <Button title="Salvar anamnese" onPress={save} loading={busy} testID="save-anamnese" />
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ---------- Evoluções ----------
function EvolucoesTab({ pid, area }: { pid: string; area: string }) {
  const [list, setList] = useState<Evolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => { setLoading(true); api.listEvolutions(pid).then(setList).catch(() => setList([])).finally(() => setLoading(false)); }, [pid]);
  useEffect(() => { load(); }, [load]);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.tabHeaderRow}>
        <Text style={styles.privateNote}><Feather name="lock" size={12} color={colors.onSurfaceTertiary} /> Visível apenas para profissionais</Text>
        <Button title="Nova" icon="plus" variant="secondary" onPress={() => setOpen(true)} testID="new-evolution" style={{ width: 110, height: 40 }} />
      </View>
      {loading ? <Loading /> : (
        <ScrollView contentContainerStyle={styles.tabScroll}>
          {list.length === 0 ? <EmptyState icon="file-text" title="Sem evoluções" subtitle="Registre a evolução clínica do paciente." /> : list.map((e) => (
            <Card key={e.id} style={{ marginBottom: spacing.md }}>
              <View style={styles.evoHead}>
                <Text style={styles.evoDate}>{fmtDate(e.date)}</Text>
                <StatusBadge label={areaLabel[e.area]} bg={colors.brandTertiary} fg={colors.brandPrimary} />
              </View>
              <Text style={styles.evoProf}>{e.professional} · {e.tipo_atendimento}</Text>
              {e.evolucao_clinica ? <EvoLine label="Evolução" v={e.evolucao_clinica} /> : null}
              {e.condutas ? <EvoLine label="Condutas" v={e.condutas} /> : null}
              {e.resposta_paciente ? <EvoLine label="Resposta" v={e.resposta_paciente} /> : null}
              {e.recomendacoes ? <EvoLine label="Recomendações" v={e.recomendacoes} /> : null}
              {e.proximos_passos ? <EvoLine label="Próximos passos" v={e.proximos_passos} /> : null}
              {e.observacoes ? <EvoLine label="Observações" v={e.observacoes} /> : null}
            </Card>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
      <EvolucaoModal visible={open} onClose={() => setOpen(false)} pid={pid} area={area} onSaved={() => { setOpen(false); load(); }} />
    </View>
  );
}

function EvoLine({ label, v }: { label: string; v: string }) {
  return <Text style={styles.evoLine}><Text style={styles.evoLineLabel}>{label}: </Text>{v}</Text>;
}

function EvolucaoModal({ visible, onClose, pid, area, onSaved }: { visible: boolean; onClose: () => void; pid: string; area: string; onSaved: () => void }) {
  const [f, setF] = useState<any>({ area, tipo_atendimento: "", evolucao_clinica: "", condutas: "", resposta_paciente: "", recomendacoes: "", proximos_passos: "", observacoes: "" });
  const [busy, setBusy] = useState(false);
  const upd = (k: string, v: any) => setF((s: any) => ({ ...s, [k]: v }));
  const save = async () => {
    setBusy(true);
    try { await api.createEvolution(pid, f); onSaved(); setF({ area, tipo_atendimento: "", evolucao_clinica: "", condutas: "", resposta_paciente: "", recomendacoes: "", proximos_passos: "", observacoes: "" }); } catch {}
    finally { setBusy(false); }
  };
  return (
    <FormModal visible={visible} onClose={onClose} title="Nova evolução" testID="evolution-modal" footer={<Button title="Registrar evolução" onPress={save} loading={busy} testID="save-evolution" />}>
      <Field label="Tipo de atendimento"><Input testID="evo-tipo" value={f.tipo_atendimento} onChangeText={(v) => upd("tipo_atendimento", v)} placeholder="Ex.: Sessão de fisioterapia" /></Field>
      <Field label="Evolução clínica"><TextArea testID="evo-clinica" value={f.evolucao_clinica} onChangeText={(v) => upd("evolucao_clinica", v)} /></Field>
      <Field label="Condutas realizadas"><TextArea testID="evo-condutas" value={f.condutas} onChangeText={(v) => upd("condutas", v)} /></Field>
      <Field label="Resposta do paciente"><Input testID="evo-resposta" value={f.resposta_paciente} onChangeText={(v) => upd("resposta_paciente", v)} /></Field>
      <Field label="Recomendações"><Input testID="evo-recomendacoes" value={f.recomendacoes} onChangeText={(v) => upd("recomendacoes", v)} /></Field>
      <Field label="Próximos passos"><Input testID="evo-proximos" value={f.proximos_passos} onChangeText={(v) => upd("proximos_passos", v)} /></Field>
      <Field label="Observações"><TextArea testID="evo-obs" value={f.observacoes} onChangeText={(v) => upd("observacoes", v)} /></Field>
    </FormModal>
  );
}

// ---------- Avaliações ----------
function AvaliacoesTab({ pid }: { pid: string }) {
  const [list, setList] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => { setLoading(true); api.listAssessments(pid).then(setList).catch(() => setList([])).finally(() => setLoading(false)); }, [pid]);
  useEffect(() => { load(); }, [load]);

  const painPoints = list.map((a) => ({ value: a.dor, label: fmtDate(a.date).slice(0, 5) }));
  const romPoints = list.map((a) => ({ value: a.amplitude_movimento, label: fmtDate(a.date).slice(0, 5) }));

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.tabHeaderRow}>
        <Text style={styles.privateNote}>Acompanhamento da evolução</Text>
        <Button title="Nova" icon="plus" variant="secondary" onPress={() => setOpen(true)} testID="new-assessment" style={{ width: 110, height: 40 }} />
      </View>
      {loading ? <Loading /> : (
        <ScrollView contentContainerStyle={styles.tabScroll}>
          {list.length === 0 ? <EmptyState icon="trending-up" title="Sem avaliações" subtitle="Registre indicadores para ver a evolução em gráficos." /> : (
            <>
              <ProgressChart title="Dor (0–10)" points={painPoints} color={colors.error} maxValue={10} />
              <ProgressChart title="Amplitude de movimento (°)" points={romPoints} color={colors.brandPrimary} />
              <SectionTitle>Registros</SectionTitle>
              {[...list].reverse().map((a) => (
                <Card key={a.id} style={{ marginBottom: spacing.sm }}>
                  <View style={styles.evoHead}>
                    <Text style={styles.evoDate}>{fmtDate(a.date)}</Text>
                    <StatusBadge label={`Dor ${a.dor}/10`} bg={colors.error + "22"} fg={colors.error} />
                  </View>
                  <Text style={styles.assessMeta}>ADM: {a.amplitude_movimento}° · Local: {a.local_dor || "—"}</Text>
                  <Text style={styles.assessMeta}>Mobilidade: {a.mobilidade || "—"} · Força: {a.forca || "—"}</Text>
                  {a.limitacoes ? <Text style={styles.assessMeta}>Limitações: {a.limitacoes}</Text> : null}
                </Card>
              ))}
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
      <AssessmentModal visible={open} onClose={() => setOpen(false)} pid={pid} onSaved={() => { setOpen(false); load(); }} />
    </View>
  );
}

function AssessmentModal({ visible, onClose, pid, onSaved }: { visible: boolean; onClose: () => void; pid: string; onSaved: () => void }) {
  const [f, setF] = useState<any>({ dor: "0", local_dor: "", amplitude_movimento: "0", mobilidade: "", flexibilidade: "", forca: "", limitacoes: "", observacoes: "" });
  const [busy, setBusy] = useState(false);
  const upd = (k: string, v: any) => setF((s: any) => ({ ...s, [k]: v }));
  const save = async () => {
    setBusy(true);
    try {
      await api.createAssessment(pid, {
        dor: parseInt(f.dor || "0", 10), local_dor: f.local_dor,
        amplitude_movimento: parseFloat(f.amplitude_movimento || "0"),
        mobilidade: f.mobilidade, flexibilidade: f.flexibilidade, forca: f.forca,
        limitacoes: f.limitacoes, observacoes: f.observacoes,
      });
      onSaved();
      setF({ dor: "0", local_dor: "", amplitude_movimento: "0", mobilidade: "", flexibilidade: "", forca: "", limitacoes: "", observacoes: "" });
    } catch {}
    finally { setBusy(false); }
  };
  return (
    <FormModal visible={visible} onClose={onClose} title="Nova avaliação" testID="assessment-modal" footer={<Button title="Registrar avaliação" onPress={save} loading={busy} testID="save-assessment" />}>
      <Field label="Nível de dor (0 a 10)">
        <Select testID="assess-dor" title="Nível de dor" value={f.dor} options={Array.from({ length: 11 }, (_, i) => ({ label: String(i), value: String(i) }))} onChange={(v) => upd("dor", v)} />
      </Field>
      <Field label="Local da dor"><Input testID="assess-local" value={f.local_dor} onChangeText={(v) => upd("local_dor", v)} placeholder="Ex.: Lombar" /></Field>
      <Field label="Amplitude de movimento (graus)"><Input testID="assess-adm" value={f.amplitude_movimento} onChangeText={(v) => upd("amplitude_movimento", v)} keyboardType="numeric" placeholder="Ex.: 90" /></Field>
      <Field label="Mobilidade"><Input testID="assess-mob" value={f.mobilidade} onChangeText={(v) => upd("mobilidade", v)} /></Field>
      <Field label="Flexibilidade"><Input testID="assess-flex" value={f.flexibilidade} onChangeText={(v) => upd("flexibilidade", v)} /></Field>
      <Field label="Força"><Input testID="assess-forca" value={f.forca} onChangeText={(v) => upd("forca", v)} /></Field>
      <Field label="Limitações funcionais"><Input testID="assess-lim" value={f.limitacoes} onChangeText={(v) => upd("limitacoes", v)} /></Field>
      <Field label="Observações"><TextArea testID="assess-obs" value={f.observacoes} onChangeText={(v) => upd("observacoes", v)} /></Field>
    </FormModal>
  );
}

// ---------- Exercícios ----------
function ExerciciosTab({ pid }: { pid: string }) {
  const [list, setList] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => { setLoading(true); api.listExercises(pid).then(setList).catch(() => setList([])).finally(() => setLoading(false)); }, [pid]);
  useEffect(() => { load(); }, [load]);

  const toggle = async (e: Exercise) => { try { await api.updateExercise(e.id, { active: !e.active }); load(); } catch {} };
  const remove = async (e: Exercise) => { try { await api.deleteExercise(e.id); load(); } catch {} };

  const active = list.filter((e) => e.active);
  const previous = list.filter((e) => !e.active);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.tabHeaderRow}>
        <Text style={styles.privateNote}>Exercícios para casa</Text>
        <Button title="Novo" icon="plus" variant="secondary" onPress={() => setOpen(true)} testID="new-exercise" style={{ width: 110, height: 40 }} />
      </View>
      {loading ? <Loading /> : (
        <ScrollView contentContainerStyle={styles.tabScroll}>
          {list.length === 0 ? <EmptyState icon="activity" title="Sem exercícios" subtitle="Prescreva exercícios para o paciente." /> : (
            <>
              <SectionTitle>Ativos</SectionTitle>
              {active.length === 0 ? <Text style={styles.mutedText}>Nenhum exercício ativo.</Text> : active.map((e) => <ExerciseCard key={e.id} e={e} onToggle={() => toggle(e)} onRemove={() => remove(e)} />)}
              {previous.length > 0 && (<><SectionTitle>Anteriores</SectionTitle>{previous.map((e) => <ExerciseCard key={e.id} e={e} onToggle={() => toggle(e)} onRemove={() => remove(e)} />)}</>)}
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
      <ExerciseModal visible={open} onClose={() => setOpen(false)} pid={pid} onSaved={() => { setOpen(false); load(); }} />
    </View>
  );
}

function ExerciseCard({ e, onToggle, onRemove }: { e: Exercise; onToggle: () => void; onRemove: () => void }) {
  return (
    <Card style={{ marginBottom: spacing.sm, opacity: e.active ? 1 : 0.7 }}>
      <View style={styles.evoHead}>
        <Text style={styles.exName}>{e.name}</Text>
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <Pressable testID={`ex-toggle-${e.id}`} onPress={onToggle} hitSlop={8}><Feather name={e.active ? "pause-circle" : "play-circle"} size={20} color={colors.brandPrimary} /></Pressable>
          <Pressable testID={`ex-remove-${e.id}`} onPress={onRemove} hitSlop={8}><Feather name="trash-2" size={18} color={colors.error} /></Pressable>
        </View>
      </View>
      {e.description ? <Text style={styles.exDesc}>{e.description}</Text> : null}
      <Text style={styles.exMeta}>{[e.series && `${e.series} séries`, e.repetitions && `${e.repetitions} rep`, e.frequency, e.duration].filter(Boolean).join(" · ")}</Text>
    </Card>
  );
}

function ExerciseModal({ visible, onClose, pid, onSaved }: { visible: boolean; onClose: () => void; pid: string; onSaved: () => void }) {
  const [f, setF] = useState<any>({ name: "", description: "", series: "", repetitions: "", frequency: "", duration: "", observacoes: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const upd = (k: string, v: any) => setF((s: any) => ({ ...s, [k]: v }));
  const save = async () => {
    if (!f.name.trim()) { setErr("Informe o nome do exercício"); return; }
    setBusy(true); setErr(null);
    try { await api.createExercise(pid, f); onSaved(); setF({ name: "", description: "", series: "", repetitions: "", frequency: "", duration: "", observacoes: "" }); } catch { setErr("Erro ao salvar"); }
    finally { setBusy(false); }
  };
  return (
    <FormModal visible={visible} onClose={onClose} title="Novo exercício" testID="exercise-modal" footer={<Button title="Prescrever exercício" onPress={save} loading={busy} testID="save-exercise" />}>
      <Field label="Nome do exercício *"><Input testID="ex-name" value={f.name} onChangeText={(v) => upd("name", v)} placeholder="Ex.: Ponte de glúteo" /></Field>
      <Field label="Descrição"><TextArea testID="ex-desc" value={f.description} onChangeText={(v) => upd("description", v)} /></Field>
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <View style={{ flex: 1 }}><Field label="Séries"><Input testID="ex-series" value={f.series} onChangeText={(v) => upd("series", v)} keyboardType="numeric" /></Field></View>
        <View style={{ flex: 1 }}><Field label="Repetições"><Input testID="ex-reps" value={f.repetitions} onChangeText={(v) => upd("repetitions", v)} keyboardType="numeric" /></Field></View>
      </View>
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <View style={{ flex: 1 }}><Field label="Frequência"><Input testID="ex-freq" value={f.frequency} onChangeText={(v) => upd("frequency", v)} placeholder="Ex.: Diário" /></Field></View>
        <View style={{ flex: 1 }}><Field label="Tempo"><Input testID="ex-time" value={f.duration} onChangeText={(v) => upd("duration", v)} placeholder="Ex.: 30s" /></Field></View>
      </View>
      <Field label="Observações"><TextArea testID="ex-obs" value={f.observacoes} onChangeText={(v) => upd("observacoes", v)} /></Field>
      {err ? <Text style={styles.err}>{err}</Text> : null}
    </FormModal>
  );
}

// ---------- Orientações (patient notes) ----------
function OrientacoesTab({ pid }: { pid: string }) {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => { setLoading(true); api.listNotes(pid).then(setList).catch(() => setList([])).finally(() => setLoading(false)); }, [pid]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try { await api.createNote(pid, text); setText(""); setOpen(false); load(); } catch {}
    finally { setBusy(false); }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.tabHeaderRow}>
        <Text style={styles.privateNote}>Orientações visíveis ao paciente</Text>
        <Button title="Nova" icon="plus" variant="secondary" onPress={() => setOpen(true)} testID="new-note" style={{ width: 110, height: 40 }} />
      </View>
      {loading ? <Loading /> : (
        <ScrollView contentContainerStyle={styles.tabScroll}>
          {list.length === 0 ? <EmptyState icon="message-circle" title="Sem orientações" subtitle="Envie recomendações e cuidados ao paciente." /> : list.map((n) => (
            <Card key={n.id} style={{ marginBottom: spacing.sm }}>
              <Text style={styles.noteText}>{n.text}</Text>
              <Text style={styles.noteMeta}>{n.professional} · {fmtDate(n.created_at)}</Text>
            </Card>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
      <FormModal visible={open} onClose={() => setOpen(false)} title="Nova orientação" testID="note-modal" footer={<Button title="Enviar orientação" onPress={save} loading={busy} testID="save-note" />}>
        <Field label="Mensagem para o paciente"><TextArea testID="note-text" value={text} onChangeText={setText} placeholder="Ex.: Aplicar gelo por 15 minutos após os exercícios." /></Field>
      </FormModal>
    </View>
  );
}

// ---------- Pagamentos ----------
function PagamentosTab({ pid, area }: { pid: string; area: string }) {
  const [list, setList] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => { setLoading(true); api.listPayments({ patient_id: pid }).then(setList).catch(() => setList([])).finally(() => setLoading(false)); }, [pid]);
  useEffect(() => { load(); }, [load]);

  const pay = async (id: string) => { try { await api.payPayment(id); load(); } catch {} };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.tabHeaderRow}>
        <Text style={styles.privateNote}>Pagamentos e pacotes</Text>
        <Button title="Novo" icon="plus" variant="secondary" onPress={() => setOpen(true)} testID="new-payment" style={{ width: 110, height: 40 }} />
      </View>
      {loading ? <Loading /> : (
        <ScrollView contentContainerStyle={styles.tabScroll}>
          {list.length === 0 ? <EmptyState icon="credit-card" title="Sem pagamentos" subtitle="Registre pagamentos e pacotes do paciente." /> : list.map((p) => {
            const sc = payStatusColors[p.status];
            return (
              <Card key={p.id} style={{ marginBottom: spacing.sm }}>
                <View style={styles.evoHead}>
                  <Text style={styles.payDesc} numberOfLines={2}>{p.description || "Pagamento"}</Text>
                  <StatusBadge label={sc.label} bg={sc.bg} fg={sc.fg} />
                </View>
                <Text style={styles.payAmount}>{fmtBRL(p.amount)}</Text>
                <Text style={styles.payMeta}>{areaLabel[p.area]} · Venc.: {fmtDate(p.due_date)}</Text>
                {p.status !== "pago" && <Button title="Marcar como pago" variant="secondary" onPress={() => pay(p.id)} testID={`pay-${p.id}`} style={{ marginTop: spacing.md, height: 42 }} />}
              </Card>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
      <PaymentModal visible={open} onClose={() => setOpen(false)} pid={pid} area={area} onSaved={() => { setOpen(false); load(); }} />
    </View>
  );
}

function PaymentModal({ visible, onClose, pid, area, onSaved }: { visible: boolean; onClose: () => void; pid: string; area: string; onSaved: () => void }) {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [ar, setAr] = useState<"fisio" | "pilates">(area === "pilates" ? "pilates" : "fisio");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { await api.createPayment({ patient_id: pid, area: ar, description: desc, amount: parseFloat(amount || "0"), status: "pendente", due_date: due || null }); onSaved(); setDesc(""); setAmount(""); setDue(""); } catch {}
    finally { setBusy(false); }
  };
  return (
    <FormModal visible={visible} onClose={onClose} title="Novo pagamento" testID="payment-modal" footer={<Button title="Registrar pagamento" onPress={save} loading={busy} testID="save-payment" />}>
      <Field label="Descrição"><Input testID="pay-desc" value={desc} onChangeText={setDesc} placeholder="Ex.: Pacote 10 sessões" /></Field>
      <Field label="Valor (R$)"><Input testID="pay-amount" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0,00" /></Field>
      <Field label="Área">
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Chip label="Fisioterapia" active={ar === "fisio"} onPress={() => setAr("fisio")} testID="pay-area-fisio" />
          <Chip label="Pilates" active={ar === "pilates"} onPress={() => setAr("pilates")} testID="pay-area-pilates" />
        </View>
      </Field>
      <Field label="Vencimento (AAAA-MM-DD)"><Input testID="pay-due" value={due} onChangeText={setDue} placeholder="2026-01-31" /></Field>
    </FormModal>
  );
}

// ---------- Presença ----------
function PresencaTab({ pid }: { pid: string }) {
  const [summary, setSummary] = useState<any>(null);
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, a] = await Promise.all([api.attendanceSummary(pid), api.listAppointments({ patient_id: pid })]);
        setSummary(s);
        setAppts(a);
      } catch {} finally { setLoading(false); }
    })();
  }, [pid]);

  if (loading) return <Loading />;

  const stats = [
    { label: "Sessões realizadas", value: summary?.realizadas ?? 0 },
    { label: "Faltas", value: summary?.faltas ?? 0 },
    { label: "Cancelamentos", value: summary?.cancelamentos ?? 0 },
  ];

  return (
    <ScrollView contentContainerStyle={styles.tabScroll}>
      <View style={styles.statsRow}>
        {stats.map((s) => (
          <Card key={s.label} style={styles.statCard}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </Card>
        ))}
      </View>
      <Card style={{ marginBottom: spacing.md }}>
        <View style={styles.dataRow}><Text style={styles.dataKey}>Último atendimento</Text><Text style={styles.dataVal}>{summary?.ultimo_atendimento ? fmtDateTime(summary.ultimo_atendimento) : "—"}</Text></View>
        <View style={styles.dataRow}><Text style={styles.dataKey}>Próximo atendimento</Text><Text style={styles.dataVal}>{summary?.proximo_atendimento ? fmtDateTime(summary.proximo_atendimento) : "—"}</Text></View>
      </Card>
      <SectionTitle>Histórico de atendimentos</SectionTitle>
      {appts.length === 0 ? <Text style={styles.mutedText}>Nenhum atendimento registrado.</Text> : [...appts].reverse().map((a) => {
        const sc = statusColors[a.status];
        return (
          <Card key={a.id} style={{ marginBottom: spacing.sm, flexDirection: "row", alignItems: "center", gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pName}>{fmtDate(a.date)} · {a.time}</Text>
              <Text style={styles.pMeta}>{a.procedure || areaLabel[a.area]}</Text>
            </View>
            <StatusBadge label={sc.label} bg={sc.bg} fg={sc.fg} />
          </Card>
        );
      })}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 32 },
  headerTitle: { fontSize: 17, fontWeight: "600", color: colors.onSurface },
  patientHead: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  pName: { fontSize: 18, fontWeight: "600", color: colors.onSurface },
  pMeta: { fontSize: 13, color: colors.onSurfaceTertiary, marginTop: 2 },
  tabBarWrap: { borderBottomWidth: 1, borderBottomColor: colors.border },
  tabBar: { paddingHorizontal: spacing.lg, gap: spacing.xs, paddingBottom: spacing.sm },
  tabItem: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabItemActive: { borderBottomColor: colors.brandPrimary },
  tabLabel: { fontSize: 14, color: colors.onSurfaceTertiary, fontWeight: "500" },
  tabLabelActive: { color: colors.brandPrimary, fontWeight: "600" },
  tabScroll: { padding: spacing.lg },
  dataRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.md, gap: spacing.md },
  dataRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  dataKey: { fontSize: 13, color: colors.onSurfaceTertiary },
  dataVal: { fontSize: 14, color: colors.onSurface, flex: 1, textAlign: "right", fontWeight: "500" },
  checkRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.md },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" },
  checkboxOn: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  checkLabel: { fontSize: 14, color: colors.onSurfaceSecondary, flex: 1 },
  savedMsg: { color: colors.success, marginBottom: spacing.md },
  tabHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  privateNote: { fontSize: 12, color: colors.onSurfaceTertiary, flex: 1 },
  evoHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm, gap: spacing.md },
  evoDate: { fontSize: 15, fontWeight: "600", color: colors.onSurface },
  evoProf: { fontSize: 12, color: colors.onSurfaceTertiary, marginBottom: spacing.sm },
  evoLine: { fontSize: 14, color: colors.onSurfaceSecondary, marginBottom: 4, lineHeight: 20 },
  evoLineLabel: { fontWeight: "600", color: colors.onSurface },
  assessMeta: { fontSize: 13, color: colors.onSurfaceSecondary, marginTop: 2 },
  exName: { fontSize: 15, fontWeight: "600", color: colors.onSurface, flex: 1 },
  exDesc: { fontSize: 13, color: colors.onSurfaceSecondary, marginBottom: spacing.sm, lineHeight: 19 },
  exMeta: { fontSize: 12, color: colors.onSurfaceTertiary },
  noteText: { fontSize: 14, color: colors.onSurface, lineHeight: 20 },
  noteMeta: { fontSize: 11, color: colors.onSurfaceTertiary, marginTop: spacing.sm },
  payDesc: { fontSize: 15, fontWeight: "500", color: colors.onSurface, flex: 1 },
  payAmount: { fontSize: 20, fontWeight: "600", color: colors.onSurface, marginTop: spacing.xs },
  payMeta: { fontSize: 12, color: colors.onSurfaceTertiary, marginTop: 2 },
  mutedText: { fontSize: 13, color: colors.onSurfaceTertiary, marginBottom: spacing.md },
  err: { color: colors.error, fontSize: 14, marginTop: spacing.sm },
  statsRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
  statCard: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 26, fontWeight: "600", color: colors.onSurface },
  statLabel: { fontSize: 11, color: colors.onSurfaceTertiary, textAlign: "center", marginTop: spacing.xs },
});

import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";

import { AppShell } from "@/src/components/AppShell";
import { Button, Card, Chip, ChipRow, Field, Input, Avatar, EmptyState, Loading } from "@/src/components/ui";
import { FormModal } from "@/src/components/FormModal";
import { Select } from "@/src/components/Select";
import { useGuard } from "@/src/hooks/useGuard";
import { api, Patient } from "@/src/api/client";
import { colors, spacing, radii, areaLabel } from "@/src/theme/tokens";
import { ageFrom } from "@/src/utils/format";

export default function Patients() {
  const { ready } = useGuard("admin");
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 900;

  const [q, setQ] = useState("");
  const [area, setArea] = useState("todos");
  const [list, setList] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.listPatients(q, area);
      setList(r);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [q, area]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!ready) return <Loading />;

  return (
    <AppShell
      role="admin"
      active="patients"
      title="Pacientes / Alunos"
      headerRight={wide ? <Button title="Novo paciente" icon="user-plus" onPress={() => setCreateOpen(true)} testID="new-patient-button" style={{ width: 190 }} /> : undefined}
    >
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Feather name="search" size={18} color={colors.onSurfaceTertiary} />
          <Input
            testID="patient-search-input"
            value={q}
            onChangeText={setQ}
            onSubmitEditing={load}
            placeholder="Buscar por nome, telefone ou email"
            style={styles.searchInput}
            returnKeyType="search"
          />
          {q ? (
            <Pressable onPress={() => { setQ(""); }} testID="clear-search"><Feather name="x" size={18} color={colors.onSurfaceTertiary} /></Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.chipWrap}>
        <ChipRow>
          {["todos", "fisio", "pilates"].map((a) => (
            <Chip key={a} testID={`patients-area-${a}`} label={a === "todos" ? "Todos" : areaLabel[a]} active={area === a} onPress={() => setArea(a)} />
          ))}
        </ChipRow>
      </View>

      {loading ? (
        <Loading />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {list.length === 0 ? (
            <EmptyState icon="users" title="Nenhum paciente encontrado" subtitle="Cadastre um novo paciente para começar." />
          ) : (
            list.map((p) => (
              <Pressable key={p.id} testID={`patient-row-${p.id}`} onPress={() => router.push(`/admin/patient/${p.id}`)}>
                <Card style={styles.patientCard}>
                  <Avatar name={p.name} size={48} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pName} numberOfLines={1}>{p.name}</Text>
                    <Text style={styles.pMeta} numberOfLines={1}>
                      {[areaLabel[p.area], p.phone, ageFrom(p.birth_date)].filter(Boolean).join(" · ")}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={colors.onSurfaceTertiary} />
                </Card>
              </Pressable>
            ))
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {!wide && (
        <Pressable testID="new-patient-fab" onPress={() => setCreateOpen(true)} style={styles.fab}>
          <Feather name="user-plus" size={24} color={colors.onBrandPrimary} />
        </Pressable>
      )}

      <NewPatientModal visible={createOpen} onClose={() => setCreateOpen(false)} onCreated={(p) => { setCreateOpen(false); router.push(`/admin/patient/${p.id}`); }} />
    </AppShell>
  );
}

function NewPatientModal({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: (p: Patient) => void }) {
  const [name, setName] = useState("");
  const [birth, setBirth] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [address, setAddress] = useState("");
  const [emergency, setEmergency] = useState("");
  const [area, setArea] = useState<"fisio" | "pilates" | "ambos">("fisio");
  const [createLogin, setCreateLogin] = useState(false);
  const [loginPass, setLoginPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reset = () => {
    setName(""); setBirth(""); setPhone(""); setWhatsapp(""); setEmail(""); setCpf(""); setAddress(""); setEmergency(""); setArea("fisio"); setCreateLogin(false); setLoginPass(""); setErr(null);
  };

  const submit = async () => {
    if (!name.trim()) { setErr("Informe o nome completo"); return; }
    if (createLogin && (!email.trim() || loginPass.length < 8)) { setErr("Para criar login, informe email e senha (mín. 8 caracteres)"); return; }
    setBusy(true); setErr(null);
    try {
      const p = await api.createPatient({
        name, birth_date: birth || null, phone, whatsapp, email, cpf, address,
        emergency_contact: emergency, area,
        create_login: createLogin, login_password: createLogin ? loginPass : null,
      });
      reset();
      onCreated(p);
    } catch (e: any) {
      setErr(e?.message ?? "Erro ao cadastrar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormModal visible={visible} onClose={onClose} title="Novo paciente / aluno" testID="new-patient-modal" footer={<Button title="Cadastrar paciente" onPress={submit} loading={busy} testID="submit-patient" />}>
      <Field label="Nome completo *"><Input testID="patient-name-input" value={name} onChangeText={setName} placeholder="Nome do paciente" autoCapitalize="words" /></Field>
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <View style={{ flex: 1 }}><Field label="Nascimento"><Input testID="patient-birth-input" value={birth} onChangeText={setBirth} placeholder="AAAA-MM-DD" /></Field></View>
        <View style={{ flex: 1 }}><Field label="CPF (opcional)"><Input testID="patient-cpf-input" value={cpf} onChangeText={setCpf} placeholder="000.000.000-00" /></Field></View>
      </View>
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <View style={{ flex: 1 }}><Field label="Telefone"><Input testID="patient-phone-input" value={phone} onChangeText={setPhone} placeholder="(11) 90000-0000" keyboardType="phone-pad" /></Field></View>
        <View style={{ flex: 1 }}><Field label="WhatsApp"><Input testID="patient-whatsapp-input" value={whatsapp} onChangeText={setWhatsapp} placeholder="(11) 90000-0000" keyboardType="phone-pad" /></Field></View>
      </View>
      <Field label="Email"><Input testID="patient-email-input" value={email} onChangeText={setEmail} placeholder="email@exemplo.com" autoCapitalize="none" keyboardType="email-address" /></Field>
      <Field label="Endereço (opcional)"><Input testID="patient-address-input" value={address} onChangeText={setAddress} placeholder="Rua, nº, bairro" /></Field>
      <Field label="Contato de emergência"><Input testID="patient-emergency-input" value={emergency} onChangeText={setEmergency} placeholder="Nome e telefone" /></Field>
      <Field label="Área do atendimento">
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Chip label="Fisioterapia" active={area === "fisio"} onPress={() => setArea("fisio")} testID="patient-area-fisio" />
          <Chip label="Pilates" active={area === "pilates"} onPress={() => setArea("pilates")} testID="patient-area-pilates" />
          <Chip label="Ambos" active={area === "ambos"} onPress={() => setArea("ambos")} testID="patient-area-ambos" />
        </View>
      </Field>

      <Pressable testID="toggle-login" onPress={() => setCreateLogin((v) => !v)} style={styles.checkRow}>
        <View style={[styles.checkbox, createLogin && styles.checkboxOn]}>
          {createLogin && <Feather name="check" size={14} color={colors.onBrandPrimary} />}
        </View>
        <Text style={styles.checkLabel}>Criar acesso do paciente (login no app)</Text>
      </Pressable>
      {createLogin && (
        <Field label="Senha de acesso do paciente">
          <Input testID="patient-login-pass" value={loginPass} onChangeText={setLoginPass} placeholder="Mín. 8 caracteres" secureTextEntry />
        </Field>
      )}
      {err ? <Text style={styles.err}>{err}</Text> : null}
    </FormModal>
  );
}

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  searchBox: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, paddingHorizontal: spacing.md },
  searchInput: { flex: 1, borderWidth: 0, backgroundColor: "transparent", minHeight: 46, paddingHorizontal: 0 },
  chipWrap: { paddingVertical: spacing.md },
  scroll: { paddingHorizontal: spacing.lg },
  patientCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.sm },
  pName: { fontSize: 16, fontWeight: "500", color: colors.onSurface },
  pMeta: { fontSize: 12, color: colors.onSurfaceTertiary, marginTop: 2 },
  fab: { position: "absolute", right: spacing.lg, bottom: spacing.xl, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.md },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" },
  checkboxOn: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  checkLabel: { fontSize: 14, color: colors.onSurfaceSecondary, flex: 1 },
  err: { color: colors.error, fontSize: 14, marginTop: spacing.sm },
});

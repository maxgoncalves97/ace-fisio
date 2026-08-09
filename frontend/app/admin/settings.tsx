import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";

import { AppShell } from "@/src/components/AppShell";
import { Card, Chip, Button, Field, Input, StatusBadge, Loading, SectionTitle } from "@/src/components/ui";
import { useGuard } from "@/src/hooks/useGuard";
import { useAuth } from "@/src/context/AuthContext";
import { api, Procedure } from "@/src/api/client";
import { colors, spacing, radii, areaLabel } from "@/src/theme/tokens";

export default function Settings() {
  const { ready } = useGuard("admin");
  const { user, signOut } = useAuth();
  const [procs, setProcs] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [area, setArea] = useState<"fisio" | "pilates">("fisio");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setProcs(await api.listProcedures()); } catch {}
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try { await api.createProcedure({ name, area }); setName(""); load(); } catch {}
    finally { setBusy(false); }
  };
  const remove = async (id: string) => { try { await api.deleteProcedure(id); load(); } catch {} };

  if (!ready) return <Loading />;

  const roleLabel = user?.role === "admin_fisio" ? "Administrador · Fisioterapia" : "Administrador · Pilates";

  return (
    <AppShell role="admin" active="settings" title="Configurações">
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={styles.accName}>{user?.name}</Text>
          <Text style={styles.accEmail}>{user?.email}</Text>
          <StatusBadge label={roleLabel} bg={colors.brandTertiary} fg={colors.brandPrimary} />
        </Card>

        <SectionTitle>Tipos de procedimento</SectionTitle>
        <Card style={{ marginBottom: spacing.lg }}>
          <Field label="Novo procedimento">
            <Input testID="proc-name-input" value={name} onChangeText={setName} placeholder="Ex.: Drenagem linfática" />
          </Field>
          <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md }}>
            <Chip label="Fisioterapia" active={area === "fisio"} onPress={() => setArea("fisio")} testID="proc-area-fisio" />
            <Chip label="Pilates" active={area === "pilates"} onPress={() => setArea("pilates")} testID="proc-area-pilates" />
          </View>
          <Button title="Adicionar procedimento" icon="plus" onPress={add} loading={busy} testID="add-procedure" />
        </Card>

        {loading ? <Loading /> : (
          <>
            {(["fisio", "pilates"] as const).map((a) => (
              <View key={a} style={{ marginBottom: spacing.lg }}>
                <Text style={styles.groupLabel}>{areaLabel[a]}</Text>
                {procs.filter((p) => p.area === a).map((p) => (
                  <Card key={p.id} style={styles.procRow}>
                    <Text style={styles.procName}>{p.name}</Text>
                    <Pressable testID={`remove-proc-${p.id}`} onPress={() => remove(p.id)} hitSlop={8}>
                      <Feather name="trash-2" size={18} color={colors.error} />
                    </Pressable>
                  </Card>
                ))}
                {procs.filter((p) => p.area === a).length === 0 && <Text style={styles.muted}>Nenhum procedimento.</Text>}
              </View>
            ))}
          </>
        )}

        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>Disponibilidade & lembretes</Text>
          <Text style={styles.infoText}>Os lembretes de consulta são exibidos no app dos pacientes. Regra de agendamento online: mínimo de 12h de antecedência. A arquitetura está preparada para WhatsApp, e-mail e SMS futuramente.</Text>
        </Card>

        <Button title="Sair da conta" icon="log-out" variant="danger" onPress={signOut} testID="settings-logout" style={{ marginTop: spacing.lg }} />
        <View style={{ height: 100 }} />
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg },
  accName: { fontSize: 17, fontWeight: "600", color: colors.onSurface },
  accEmail: { fontSize: 13, color: colors.onSurfaceTertiary, marginBottom: spacing.md, marginTop: 2 },
  groupLabel: { fontSize: 13, fontWeight: "600", color: colors.onSurfaceSecondary, marginBottom: spacing.sm },
  procRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm, paddingVertical: spacing.md },
  procName: { fontSize: 14, color: colors.onSurface },
  muted: { fontSize: 13, color: colors.onSurfaceTertiary },
  infoCard: { backgroundColor: colors.surfaceTertiary, borderColor: colors.border },
  infoTitle: { fontSize: 14, fontWeight: "600", color: colors.onSurface, marginBottom: spacing.sm },
  infoText: { fontSize: 13, color: colors.onSurfaceSecondary, lineHeight: 19 },
});

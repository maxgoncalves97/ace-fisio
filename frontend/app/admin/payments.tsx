import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { AppShell } from "@/src/components/AppShell";
import { Card, Chip, ChipRow, Button, StatusBadge, EmptyState, Loading } from "@/src/components/ui";
import { useGuard } from "@/src/hooks/useGuard";
import { api, Payment } from "@/src/api/client";
import { colors, spacing, payStatusColors, areaLabel } from "@/src/theme/tokens";
import { fmtBRL, fmtDate } from "@/src/utils/format";

export default function Payments() {
  const { ready } = useGuard("admin");
  const router = useRouter();
  const [status, setStatus] = useState("todos");
  const [area, setArea] = useState("todos");
  const [list, setList] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.listPayments({ status, area });
      setList(r);
    } catch { setList([]); }
    finally { setLoading(false); }
  }, [status, area]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const pay = async (id: string) => { try { await api.payPayment(id); load(); } catch {} };

  const totalPending = list.filter((p) => p.status !== "pago").reduce((s, p) => s + p.amount, 0);

  if (!ready) return <Loading />;

  return (
    <AppShell role="admin" active="payments" title="Pagamentos">
      <View style={styles.filters}>
        <ChipRow>
          {["todos", "pendente", "atrasado", "pago"].map((s) => (
            <Chip key={s} testID={`pay-status-${s}`} label={s === "todos" ? "Todos" : payStatusColors[s]?.label ?? s} active={status === s} onPress={() => setStatus(s)} />
          ))}
        </ChipRow>
      </View>
      <View style={styles.filters}>
        <ChipRow>
          {["todos", "fisio", "pilates"].map((a) => (
            <Chip key={a} testID={`pay-area-${a}`} label={a === "todos" ? "Todas áreas" : areaLabel[a]} active={area === a} onPress={() => setArea(a)} />
          ))}
        </ChipRow>
      </View>

      {loading ? <Loading /> : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Card style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total em aberto</Text>
            <Text style={styles.totalValue}>{fmtBRL(totalPending)}</Text>
          </Card>
          {list.length === 0 ? <EmptyState icon="credit-card" title="Nenhum pagamento" subtitle="Registre pagamentos nas fichas dos pacientes." /> : list.map((p) => {
            const sc = payStatusColors[p.status];
            return (
              <Card key={p.id} style={{ marginBottom: spacing.sm }}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{p.patient_name}</Text>
                    <Text style={styles.desc}>{p.description || "Pagamento"}</Text>
                    <Text style={styles.meta}>{areaLabel[p.area]} · Venc.: {fmtDate(p.due_date)}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: spacing.sm }}>
                    <Text style={styles.amount}>{fmtBRL(p.amount)}</Text>
                    <StatusBadge label={sc.label} bg={sc.bg} fg={sc.fg} />
                  </View>
                </View>
                {p.status !== "pago" && <Button title="Marcar como pago" variant="secondary" onPress={() => pay(p.id)} testID={`markpaid-${p.id}`} style={{ marginTop: spacing.md, height: 42 }} />}
              </Card>
            );
          })}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  filters: { paddingVertical: spacing.sm },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  totalCard: { marginBottom: spacing.md, backgroundColor: colors.brandTertiary, borderColor: colors.brandSecondary },
  totalLabel: { fontSize: 13, color: colors.brandPrimary, fontWeight: "500" },
  totalValue: { fontSize: 28, fontWeight: "700", color: colors.brandPrimary, marginTop: spacing.xs },
  row: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md },
  name: { fontSize: 15, fontWeight: "600", color: colors.onSurface },
  desc: { fontSize: 13, color: colors.onSurfaceSecondary, marginTop: 2 },
  meta: { fontSize: 12, color: colors.onSurfaceTertiary, marginTop: 2 },
  amount: { fontSize: 17, fontWeight: "600", color: colors.onSurface },
});

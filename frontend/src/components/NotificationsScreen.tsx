import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";

import { AppShell } from "@/src/components/AppShell";
import { Card, EmptyState, Loading, Button } from "@/src/components/ui";
import { useGuard } from "@/src/hooks/useGuard";
import { api, Notification } from "@/src/api/client";
import { colors, spacing } from "@/src/theme/tokens";
import { fmtDateTime } from "@/src/utils/format";
import { WhatsAppPreferences } from "./WhatsAppPreferences";

export function NotificationsScreen({ role }: { role: "admin" | "patient" }) {
  const { ready } = useGuard(role);
  const [list, setList] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setList(await api.listNotifications()); } catch { setList([]); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const readAll = async () => { try { await api.readAllNotifications(); load(); } catch {} };
  const readOne = async (n: Notification) => { if (n.read) return; try { await api.readNotification(n.id); load(); } catch {} };

  const iconFor = (t: string): keyof typeof Feather.glyphMap => {
    if (t === "appointment") return "calendar";
    if (t === "payment") return "credit-card";
    if (t === "exercise") return "activity";
    if (t === "note") return "message-circle";
    return "bell";
  };

  if (!ready) return <Loading />;

  const unread = list.filter((n) => !n.read).length;

  return (
    <AppShell
      role={role}
      active="notifications"
      title="Notificações"
      headerRight={unread > 0 ? <Button title="Marcar lidas" variant="ghost" onPress={readAll} testID="read-all" style={{ width: 140, height: 40 }} /> : undefined}
    >
      {loading ? <Loading /> : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {role === "patient" && <WhatsAppPreferences />}
          {list.length === 0 ? <EmptyState icon="bell" title="Tudo em dia" subtitle="Você não tem novas notificações." /> : list.map((n) => (
            <Pressable key={n.id} testID={`notif-${n.id}`} onPress={() => readOne(n)}>
              <Card style={[styles.card, !n.read && styles.unreadCard]}>
                <View style={styles.iconWrap}><Feather name={iconFor(n.type)} size={18} color={colors.brandPrimary} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{n.title}</Text>
                  <Text style={styles.body}>{n.body}</Text>
                  <Text style={styles.time}>{fmtDateTime(n.created_at)}</Text>
                </View>
                {!n.read && <View style={styles.dot} />}
              </Card>
            </Pressable>
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg },
  card: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, marginBottom: spacing.sm },
  unreadCard: { borderColor: colors.brandSecondary, backgroundColor: colors.surfaceSecondary },
  iconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 15, fontWeight: "600", color: colors.onSurface },
  body: { fontSize: 13, color: colors.onSurfaceSecondary, marginTop: 2, lineHeight: 18 },
  time: { fontSize: 11, color: colors.onSurfaceTertiary, marginTop: spacing.xs },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brandPrimary, marginTop: 4 },
});

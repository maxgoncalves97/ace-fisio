import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, AceSession, SessionType } from "@/src/api/client";
import { colors, spacing, radii, type, images } from "@/src/theme/tokens";
import { fmtTime, nextNDays } from "@/src/utils/format";

export default function Book() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const initialType = (params.type === "physio" || params.type === "pilates") ? (params.type as SessionType) : "pilates";

  const [selType, setSelType] = useState<SessionType>(initialType);
  const [dates] = useState(() => nextNDays(14));
  const [selDate, setSelDate] = useState<string>(dates[0].ymd);
  const [sessions, setSessions] = useState<AceSession[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.listSessions({ type: selType, date: selDate });
      setSessions(list);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [selType, selDate]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (params.type === "physio" || params.type === "pilates") {
      setSelType(params.type as SessionType);
    }
  }, [params.type]);

  const empty = !loading && sessions.length === 0;

  return (
    <SafeAreaView style={styles.root} edges={["top"]} testID="book-screen">
      {/* Sticky header */}
      <View style={styles.headerBlock}>
        <Text style={styles.title}>Book a session</Text>

        {/* Type chips */}
        <View style={styles.chipsRow}>
          {(["pilates", "physio"] as SessionType[]).map((t) => {
            const active = selType === t;
            return (
              <Pressable
                key={t}
                testID={`type-chip-${t}`}
                onPress={() => setSelType(t)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {t === "pilates" ? "Pilates" : "Physio"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Date chip row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateRow}
        >
          {dates.map((d) => {
            const active = d.ymd === selDate;
            return (
              <Pressable
                key={d.ymd}
                testID={`date-chip-${d.ymd}`}
                onPress={() => setSelDate(d.ymd)}
                style={[styles.dateChip, active && styles.dateChipActive]}
              >
                <Text style={[styles.dateLabel, active && styles.dateLabelActive]}>{d.label}</Text>
                <Text style={[styles.dateNum, active && styles.dateNumActive]}>
                  {d.date.format("D")}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxxl }}>
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.brandPrimary} />
          </View>
        )}
        {empty && (
          <View style={styles.emptyBox}>
            <Image source={{ uri: images.emptyLeaf }} style={styles.emptyImg} contentFit="cover" />
            <Text style={styles.emptyTitle}>No sessions on this day</Text>
            <Text style={styles.emptySub}>
              Try another date, or add sessions from the Studio tab.
            </Text>
          </View>
        )}
        {!loading && sessions.map((s) => {
          const left = s.capacity - s.booked_count;
          const full = left <= 0;
          return (
            <Pressable
              key={s.id}
              testID={`session-row-${s.id}`}
              onPress={() => router.push(`/session/${s.id}`)}
              style={styles.sessionRow}
            >
              <View style={styles.timeCol}>
                <Text style={styles.timeText}>{fmtTime(s.start_time)}</Text>
                <Text style={styles.durText}>{s.duration_min}m</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sTitle} numberOfLines={1}>{s.title}</Text>
                <Text style={styles.sSub} numberOfLines={1}>
                  {s.therapist?.name ?? "—"}
                </Text>
                <Text style={styles.sMeta}>
                  {s.type === "pilates" ? `${left}/${s.capacity} spots` : full ? "Booked" : "Available"}
                </Text>
              </View>
              <Text style={[styles.bookCta, full && { color: colors.onSurfaceTertiary }]}>
                {full ? "Full" : "Book"}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  headerBlock: {
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.divider,
    backgroundColor: colors.surface,
  },
  title: {
    fontFamily: type.displayLG.fontFamily,
    fontSize: 28,
    color: colors.onSurface,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  chipsRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { color: colors.onSurfaceSecondary, fontSize: 13, letterSpacing: 1 },
  chipTextActive: { color: colors.onBrandPrimary },
  dateRow: {
    height: 68,
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  dateChip: {
    width: 52,
    height: 60,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  dateChipActive: { backgroundColor: colors.brandTertiary, borderColor: colors.brandTertiary },
  dateLabel: {
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.onSurfaceTertiary,
  },
  dateLabelActive: { color: colors.brandPrimary },
  dateNum: { fontFamily: type.displayMD.fontFamily, fontSize: 20, color: colors.onSurface, marginTop: 2 },
  dateNumActive: { color: colors.brandPrimary },
  loadingBox: { paddingVertical: spacing.xxl, alignItems: "center" },
  emptyBox: { alignItems: "center", paddingHorizontal: spacing.xl, paddingTop: spacing.xxl },
  emptyImg: { width: 200, height: 200, borderRadius: radii.lg, marginBottom: spacing.lg, opacity: 0.6 },
  emptyTitle: { fontFamily: type.displayMD.fontFamily, fontSize: 20, color: colors.onSurface },
  emptySub: { color: colors.onSurfaceTertiary, textAlign: "center", marginTop: spacing.sm },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.divider,
    gap: spacing.md,
  },
  timeCol: { width: 68 },
  timeText: { fontFamily: type.displayMD.fontFamily, fontSize: 18, color: colors.brandPrimary },
  durText: { fontSize: 11, color: colors.onSurfaceTertiary, marginTop: 2, letterSpacing: 1 },
  sTitle: { fontSize: 15, color: colors.onSurface },
  sSub: { fontSize: 12, color: colors.onSurfaceSecondary, marginTop: 2 },
  sMeta: { fontSize: 11, color: colors.onSurfaceTertiary, marginTop: 4, letterSpacing: 0.5 },
  bookCta: {
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: colors.brandPrimary,
    fontWeight: "500",
  },
});

import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, AceSession, Therapist } from "@/src/api/client";
import { useUser } from "@/src/context/UserContext";
import { colors, spacing, radii, type, images } from "@/src/theme/tokens";
import { fmtTime } from "@/src/utils/format";

export default function Home() {
  const router = useRouter();
  const { user } = useUser();
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [todaySessions, setTodaySessions] = useState<AceSession[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [ts, ss] = await Promise.all([
        api.listTherapists(),
        api.listSessions({}),
      ]);
      setTherapists(ts);
      // Only show next 5 upcoming today
      const today = new Date().toDateString();
      setTodaySessions(
        ss.filter((s) => new Date(s.start_time).toDateString() === today).slice(0, 5)
      );
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]} testID="home-screen">
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandPrimary} />}
      >
        <View style={styles.header}>
          <Text style={styles.overline}>{greeting()}</Text>
          <Text style={styles.displayName} numberOfLines={1}>
            {user?.name ?? "Guest"}
          </Text>
        </View>

        {/* Hero cards */}
        <View style={styles.heroCol}>
          <HeroCard
            testID="home-hero-pilates"
            title="Pilates Classes"
            eyebrow="Group Sessions"
            img={images.homePilates}
            onPress={() => router.push({ pathname: "/(tabs)/book", params: { type: "pilates" } })}
          />
          <HeroCard
            testID="home-hero-physio"
            title="Physiotherapy"
            eyebrow="1:1 Appointments"
            img={images.homePhysio}
            onPress={() => router.push({ pathname: "/(tabs)/book", params: { type: "physio" } })}
          />
        </View>

        {/* Today */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionOverline}>Today at the studio</Text>
        </View>
        {todaySessions.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>No sessions scheduled today.</Text>
          </View>
        ) : (
          todaySessions.map((s) => (
            <Pressable
              key={s.id}
              testID={`home-today-session-${s.id}`}
              onPress={() => router.push(`/session/${s.id}`)}
              style={styles.todayRow}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.todayTime}>{fmtTime(s.start_time)}</Text>
                <Text style={styles.todayTitle} numberOfLines={1}>{s.title}</Text>
                <Text style={styles.todaySub} numberOfLines={1}>
                  {s.therapist?.name ?? "—"} · {s.type === "pilates" ? "Pilates" : "Physio"}
                </Text>
              </View>
              <Text style={styles.todayCap}>
                {s.capacity - s.booked_count > 0 ? `${s.capacity - s.booked_count} left` : "Full"}
              </Text>
            </Pressable>
          ))
        )}

        {/* Specialists */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionOverline}>Our Specialists</Text>
        </View>
        {therapists.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>
              No specialists yet. Add them from the Studio tab.
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.specRow}
          >
            {therapists.map((t) => (
              <Pressable
                key={t.id}
                testID={`home-specialist-${t.id}`}
                onPress={() => router.push(`/therapist/${t.id}`)}
                style={styles.specCard}
              >
                <View style={styles.avatarWrap}>
                  {t.photo_url ? (
                    <Image source={{ uri: t.photo_url }} style={styles.avatar} contentFit="cover" />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                      <Text style={styles.avatarInitial}>{t.name.charAt(0)}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.specName} numberOfLines={1}>{t.name}</Text>
                <Text style={styles.specRole} numberOfLines={1}>{t.role}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function HeroCard({
  title,
  eyebrow,
  img,
  onPress,
  testID,
}: {
  title: string;
  eyebrow: string;
  img: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable testID={testID} onPress={onPress} style={styles.hero}>
      <Image source={{ uri: img }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
      <LinearGradient
        colors={["transparent", "rgba(28,38,28,0.9)"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.heroContent}>
        <Text style={styles.heroEyebrow}>{eyebrow}</Text>
        <Text style={styles.heroTitle}>{title}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { paddingBottom: spacing.xl },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.lg },
  overline: { ...type.overline },
  displayName: {
    fontFamily: type.displayLG.fontFamily,
    fontSize: 32,
    color: colors.onSurface,
    marginTop: spacing.sm,
  },
  heroCol: { paddingHorizontal: spacing.xl, gap: spacing.md },
  hero: {
    height: 200,
    borderRadius: radii.lg,
    overflow: "hidden",
    backgroundColor: colors.surfaceTertiary,
  },
  heroContent: {
    position: "absolute",
    left: spacing.xl,
    right: spacing.xl,
    bottom: spacing.xl,
  },
  heroEyebrow: {
    color: "rgba(253,253,251,0.7)",
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontFamily: type.displayLG.fontFamily,
    color: colors.onSurfaceInverse,
    fontSize: 30,
    marginTop: spacing.xs,
  },
  sectionHeader: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
  },
  sectionOverline: { ...type.overline, color: colors.onSurfaceTertiary },
  todayRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.divider,
  },
  todayTime: {
    fontFamily: type.displayMD.fontFamily,
    fontSize: 18,
    color: colors.brandPrimary,
    marginBottom: spacing.xs,
  },
  todayTitle: { fontSize: 15, color: colors.onSurface },
  todaySub: { fontSize: 12, color: colors.onSurfaceSecondary, marginTop: 2 },
  todayCap: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  emptyRow: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  emptyText: { color: colors.onSurfaceTertiary, fontSize: 13 },
  specRow: { paddingHorizontal: spacing.xl, gap: spacing.lg, paddingRight: spacing.xxl },
  specCard: { width: 92, alignItems: "center" },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: "hidden",
    backgroundColor: colors.brandTertiary,
    marginBottom: spacing.sm,
  },
  avatar: { width: "100%", height: "100%" },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontFamily: type.displayLG.fontFamily, fontSize: 28, color: colors.brandPrimary },
  specName: { fontSize: 13, color: colors.onSurface, textAlign: "center" },
  specRole: { fontSize: 11, color: colors.onSurfaceTertiary, textAlign: "center", marginTop: 2 },
});

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radii } from "@/src/theme/tokens";
import { useAuth } from "@/src/context/AuthContext";
import { AceLogo } from "./AceLogo";

export type NavItem = {
  key: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  route: string;
  bottom?: boolean; // show in mobile bottom bar
};

export const ADMIN_NAV: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "grid", route: "/admin/dashboard", bottom: true },
  { key: "agenda", label: "Agenda", icon: "calendar", route: "/admin/agenda", bottom: true },
  { key: "patients", label: "Pacientes", icon: "users", route: "/admin/patients", bottom: true },
  { key: "payments", label: "Pagamentos", icon: "credit-card", route: "/admin/payments", bottom: true },
  { key: "notifications", label: "Notificações", icon: "bell", route: "/admin/notifications" },
  { key: "settings", label: "Configurações", icon: "settings", route: "/admin/settings", bottom: true },
];

export const PATIENT_NAV: NavItem[] = [
  { key: "dashboard", label: "Início", icon: "home", route: "/patient/dashboard", bottom: true },
  { key: "booking", label: "Agendar", icon: "plus-circle", route: "/patient/booking", bottom: true },
  { key: "exercises", label: "Exercícios", icon: "activity", route: "/patient/exercises", bottom: true },
  { key: "history", label: "Histórico", icon: "clock", route: "/patient/history", bottom: true },
  { key: "notifications", label: "Notificações", icon: "bell", route: "/patient/notifications", bottom: true },
];

const BREAKPOINT = 900;

export function AppShell({
  active,
  title,
  subtitle,
  children,
  headerRight,
  role,
}: {
  active: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
  role: "admin" | "patient";
}) {
  const { width } = useWindowDimensions();
  const wide = width >= BREAKPOINT && Platform.OS === "web";
  const nav = role === "admin" ? ADMIN_NAV : PATIENT_NAV;
  const router = useRouter();
  const { user, signOut } = useAuth();

  const go = (route: string) => router.replace(route as any);

  if (wide) {
    return (
      <View style={styles.wideRoot}>
        {/* Sidebar */}
        <View style={styles.sidebar}>
          <View style={styles.brandRow}>
              <AceLogo width={180} onDark />
              <Text style={styles.brandSub}>{role === "admin" ? "Administração" : "Paciente"}</Text>
          </View>
          <ScrollView style={{ flex: 1 }}>
            {nav.map((n) => {
              const isActive = active === n.key;
              return (
                <Pressable
                  key={n.key}
                  testID={`sidebar-${n.key}`}
                  onPress={() => go(n.route)}
                  style={[styles.sideItem, isActive && styles.sideItemActive]}
                >
                  <Feather name={n.icon} size={18} color={isActive ? colors.surfaceInverse : "#DDEBC9"} />
                  <Text style={[styles.sideLabel, isActive && styles.sideLabelActive]}>{n.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.userBox}>
            <Text style={styles.userName} numberOfLines={1}>{user?.name || user?.email}</Text>
            <Pressable testID="sidebar-logout" onPress={signOut} style={styles.logoutBtn}>
              <Feather name="log-out" size={16} color={colors.brandLime} />
              <Text style={styles.logoutText}>Sair</Text>
            </Pressable>
          </View>
        </View>

        {/* Content */}
        <View style={styles.wideContent}>
          <View style={styles.wideHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>{title}</Text>
              {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
            </View>
            {headerRight}
          </View>
          <View style={{ flex: 1 }}>{children}</View>
        </View>
      </View>
    );
  }

  // Mobile / narrow
  const bottomItems = nav.filter((n) => n.bottom);
  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]} style={styles.headerSafe}>
        <View style={styles.mobileHeader}>
          <AceLogo variant="icon" width={38} />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
            {subtitle ? <Text style={styles.headerSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
          </View>
          {headerRight}
          <Pressable testID="header-logout" accessibilityRole="button" accessibilityLabel="Sair da conta" onPress={signOut} style={styles.mobileLogout}>
            <Feather name="log-out" size={18} color={colors.brandPrimary} />
            <Text style={styles.mobileLogoutText}>Sair</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <View style={{ flex: 1 }}>{children}</View>

      <SafeAreaView edges={["bottom"]} style={styles.tabBarSafe}>
        <View style={styles.tabBar}>
          {bottomItems.map((n) => {
            const isActive = active === n.key;
            return (
              <Pressable
                key={n.key}
                testID={`tab-${n.key}`}
                onPress={() => go(n.route)}
                style={styles.tabItem}
              >
                <Feather name={n.icon} size={22} color={isActive ? colors.brandPrimary : colors.onSurfaceTertiary} />
                <Text style={[styles.tabLabel, { color: isActive ? colors.brandPrimary : colors.onSurfaceTertiary }]}>
                  {n.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  mobileLogout: { minHeight: 44, paddingHorizontal: spacing.sm, flexDirection: "row", alignItems: "center", gap: spacing.xs },
  mobileLogoutText: { fontSize: 14, fontWeight: "600", color: colors.brandPrimary },
  headerSafe: { backgroundColor: colors.surfaceSecondary, borderBottomWidth: 1, borderBottomColor: colors.border },
  mobileHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 56,
    gap: spacing.md,
  },
  tabBarSafe: { backgroundColor: colors.surfaceSecondary, borderTopWidth: 1, borderTopColor: colors.border },
  tabBar: { flexDirection: "row", paddingTop: spacing.sm, paddingBottom: spacing.xs },
  tabItem: { flex: 1, alignItems: "center", gap: 3, paddingVertical: spacing.xs },
  tabLabel: { fontSize: 10, fontWeight: "500" },

  // wide
  wideRoot: { flex: 1, flexDirection: "row", backgroundColor: colors.surface },
  sidebar: {
    width: 248,
    backgroundColor: colors.surfaceInverse,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  brandRow: { alignItems: "flex-start", gap: spacing.sm, paddingHorizontal: spacing.sm, marginBottom: spacing.xl },
  brandSub: { fontSize: 12, color: "#DDEBC9" },
  sideItem: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderRadius: radii.sm, marginBottom: 2,
  },
  sideItemActive: { backgroundColor: colors.brandLime },
  sideLabel: { fontSize: 14, color: "#FFFFFF", fontWeight: "500" },
  sideLabelActive: { color: colors.brandPrimary, fontWeight: "600" },
  userBox: { borderTopWidth: 1, borderTopColor: "#40635A", paddingTop: spacing.md },
  userName: { fontSize: 13, color: "#DDEBC9", paddingHorizontal: spacing.sm, marginBottom: spacing.sm },
  logoutBtn: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  logoutText: { color: "#FFFFFF", fontSize: 14, fontWeight: "500" },
  wideContent: { flex: 1 },
  wideHeader: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.xxl, paddingVertical: spacing.xl,
    borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface,
  },
  headerTitle: { fontSize: 22, fontWeight: "600", color: colors.onSurface },
  headerSubtitle: { fontSize: 13, color: colors.onSurfaceTertiary, marginTop: 2 },
});

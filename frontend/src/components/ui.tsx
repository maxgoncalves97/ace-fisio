import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  TextInput,
  TextInputProps,
  ViewStyle,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, spacing, radii, shadow } from "@/src/theme/tokens";

export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  icon,
  testID,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Feather.glyphMap;
  testID?: string;
  style?: ViewStyle;
}) {
  const isPrimary = variant === "primary";
  const isDanger = variant === "danger";
  const isGhost = variant === "ghost";
  const bg = isPrimary ? colors.brandPrimary : isDanger ? colors.error : isGhost ? "transparent" : colors.brandTertiary;
  const fg = isPrimary || isDanger ? "#FFFFFF" : colors.brandPrimary;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.88 : 1 },
        isGhost && styles.btnGhost,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.btnInner}>
          {icon && <Feather name={icon} size={16} color={fg} style={{ marginRight: spacing.sm }} />}
          <Text style={[styles.btnText, { color: fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Card({ children, style, testID }: { children: React.ReactNode; style?: ViewStyle; testID?: string }) {
  return (
    <View testID={testID} style={[styles.card, style]}>
      {children}
    </View>
  );
}

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function Input(props: TextInputProps & { testID?: string }) {
  return (
    <TextInput
      placeholderTextColor={colors.onSurfaceTertiary}
      style={styles.input}
      {...props}
    />
  );
}

export function TextArea(props: TextInputProps & { testID?: string }) {
  return (
    <TextInput
      placeholderTextColor={colors.onSurfaceTertiary}
      multiline
      style={[styles.input, styles.textarea]}
      {...props}
    />
  );
}

export function Chip({
  label,
  active,
  onPress,
  testID,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
    >
      {children}
    </ScrollView>
  );
}

export function StatusBadge({ label, bg, fg, testID }: { label: string; bg: string; fg: string; testID?: string }) {
  return (
    <View testID={testID} style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function Avatar({ name, size = 44, uri }: { name: string; size?: number; uri?: string }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{initials || "?"}</Text>
    </View>
  );
}

export function EmptyState({
  icon = "inbox",
  title,
  subtitle,
  testID,
}: {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  testID?: string;
}) {
  return (
    <View style={styles.empty} testID={testID}>
      <View style={styles.emptyIcon}>
        <Feather name={icon} size={28} color={colors.brandPrimary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySub}>{subtitle}</Text> : null}
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.brandPrimary} size="large" />
    </View>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

const styles = StyleSheet.create({
  btn: {
    height: 50,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  btnGhost: { borderWidth: 1, borderColor: colors.border },
  btnInner: { flexDirection: "row", alignItems: "center" },
  btnText: { fontSize: 15, fontWeight: "500" },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  field: { marginBottom: spacing.lg },
  fieldLabel: {
    fontSize: 13,
    color: colors.onSurfaceTertiary,
    marginBottom: spacing.sm,
    fontWeight: "500",
  },
  fieldError: { color: colors.error, fontSize: 12, marginTop: spacing.xs },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.onSurface,
    minHeight: 48,
  },
  textarea: { minHeight: 96, textAlignVertical: "top", paddingTop: spacing.md },
  chip: {
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    backgroundColor: colors.surfaceSecondary,
  },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { fontSize: 13, color: colors.onSurfaceSecondary, fontWeight: "500" },
  chipTextActive: { color: colors.onBrandPrimary },
  chipRow: { gap: spacing.sm, paddingHorizontal: spacing.lg, alignItems: "center" },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 12, fontWeight: "500" },
  avatar: {
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.brandPrimary, fontWeight: "600" },
  empty: { alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxxl, paddingHorizontal: spacing.xl },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  emptyTitle: { fontSize: 17, fontWeight: "600", color: colors.onSurface, textAlign: "center" },
  emptySub: { fontSize: 14, color: colors.onSurfaceTertiary, textAlign: "center", marginTop: spacing.sm, lineHeight: 20 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxxl },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.onSurfaceTertiary,
    marginBottom: spacing.md,
  },
});

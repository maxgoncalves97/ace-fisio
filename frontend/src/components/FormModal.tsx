import React from "react";
import {
  Modal as RNModal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, spacing, radii } from "@/src/theme/tokens";

export function FormModal({
  visible,
  onClose,
  title,
  children,
  footer,
  testID,
  centered = false,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  testID?: string;
  centered?: boolean;
}) {
  const { width } = useWindowDimensions();
  const wide = centered || width >= 720;

  return (
    <RNModal visible={visible} transparent animationType={wide ? "fade" : "slide"} onRequestClose={onClose}>
      <View style={[styles.backdrop, wide && styles.backdropCenter, centered && { backgroundColor: "rgba(24,28,26,0.2)" }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} testID={`${testID}-backdrop`} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[styles.sheet, wide ? styles.sheetWide : styles.sheetMobile]}
        >
          <View style={styles.handleRow}>
            <Text style={styles.title} testID={`${testID}-title`}>{title}</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" testID={`${testID}-close`} hitSlop={10}>
              <Feather name="x" size={22} color={colors.onSurfaceTertiary} />
            </Pressable>
          </View>
          <ScrollView
            style={{ flexGrow: 0 }}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </KeyboardAvoidingView>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(24,28,26,0.45)", justifyContent: "flex-end" },
  backdropCenter: { justifyContent: "center", alignItems: "center" },
  sheet: { backgroundColor: colors.surface, overflow: "hidden" },
  sheetMobile: { borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, maxHeight: "92%" },
  sheetWide: { borderRadius: radii.lg, width: 560, maxWidth: "92%", maxHeight: "88%" },
  handleRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  title: { fontSize: 18, fontWeight: "600", color: colors.onSurface, flex: 1 },
  body: { padding: spacing.xl },
  footer: {
    padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.divider,
    backgroundColor: colors.surfaceSecondary,
  },
});

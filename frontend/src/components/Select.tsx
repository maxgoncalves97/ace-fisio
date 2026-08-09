import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { FormModal } from "@/src/components/FormModal";
import { colors, spacing, radii } from "@/src/theme/tokens";

export type Option = { label: string; value: string };

export function Select({
  value,
  options,
  onChange,
  placeholder = "Selecione",
  title = "Selecione",
  testID,
}: {
  value?: string | null;
  options: Option[];
  onChange: (v: string) => void;
  placeholder?: string;
  title?: string;
  testID?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <Pressable testID={testID} onPress={() => setOpen(true)} style={styles.trigger}>
        <Text style={[styles.triggerText, !selected && styles.placeholder]} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <Feather name="chevron-down" size={18} color={colors.onSurfaceTertiary} />
      </Pressable>
      <FormModal visible={open} onClose={() => setOpen(false)} title={title} testID={`${testID}-modal`}>
        <ScrollView style={{ maxHeight: 420 }}>
          {options.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma opção disponível.</Text>
          ) : (
            options.map((o) => {
              const isSel = o.value === value;
              return (
                <Pressable
                  key={o.value}
                  testID={`${testID}-option-${o.value}`}
                  onPress={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  style={[styles.option, isSel && styles.optionSel]}
                >
                  <Text style={[styles.optionText, isSel && styles.optionTextSel]}>{o.label}</Text>
                  {isSel && <Feather name="check" size={18} color={colors.brandPrimary} />}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </FormModal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  triggerText: { fontSize: 15, color: colors.onSurface, flex: 1, marginRight: spacing.sm },
  placeholder: { color: colors.onSurfaceTertiary },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  optionSel: { backgroundColor: colors.brandTertiary },
  optionText: { fontSize: 15, color: colors.onSurface },
  optionTextSel: { color: colors.brandPrimary, fontWeight: "600" },
  emptyText: { color: colors.onSurfaceTertiary, padding: spacing.lg, textAlign: "center" },
});

import React from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { colors, spacing, radii } from "@/src/theme/tokens";

type Point = { value: number; label?: string };

export function ProgressChart({
  title,
  points,
  color = colors.brandPrimary,
  maxValue,
  suffix = "",
}: {
  title: string;
  points: Point[];
  color?: string;
  maxValue?: number;
  suffix?: string;
}) {
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const chartWidth = Math.min(wide ? 520 : width - 96, 560);

  if (points.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.empty}>Sem dados registrados ainda.</Text>
      </View>
    );
  }

  const data = points.map((p) => ({
    value: p.value,
    label: p.label,
    dataPointText: `${p.value}${suffix}`,
  }));

  const last = points[points.length - 1].value;
  const first = points[0].value;
  const delta = last - first;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        <Text style={[styles.delta, { color: color }]}>
          {points.length > 1 ? `${delta > 0 ? "+" : ""}${delta.toFixed(0)}${suffix}` : `${last}${suffix}`}
        </Text>
      </View>
      <View style={styles.chartWrap}>
        <LineChart
          data={data}
          width={chartWidth}
          height={160}
          color={color}
          thickness={3}
          curved
          hideRules={false}
          rulesColor={colors.divider}
          rulesType="solid"
          yAxisColor={colors.border}
          xAxisColor={colors.border}
          dataPointsColor={color}
          dataPointsRadius={4}
          textColor={colors.onSurfaceTertiary}
          textFontSize={10}
          textShiftY={-8}
          maxValue={maxValue}
          yAxisTextStyle={{ color: colors.onSurfaceTertiary, fontSize: 10 }}
          xAxisLabelTextStyle={{ color: colors.onSurfaceTertiary, fontSize: 9 }}
          initialSpacing={16}
          endSpacing={16}
          startFillColor={color}
          areaChart
          startOpacity={0.12}
          endOpacity={0.0}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  title: { fontSize: 15, fontWeight: "600", color: colors.onSurface },
  delta: { fontSize: 15, fontWeight: "600" },
  empty: { fontSize: 13, color: colors.onSurfaceTertiary, paddingVertical: spacing.lg },
  chartWrap: { alignItems: "center", overflow: "hidden" },
});

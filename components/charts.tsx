import React from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../hooks/use-theme';
import { RADIUS, SPACING } from '../utils/tokens';
import { Text } from './typography';

function Bars({ values, color, height }: { values: number[]; color: string; height: number }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return (
    <View style={[styles.bars, { height }]}>
      {values.map((v, i) => (
        <View
          key={i}
          style={[styles.bar, { backgroundColor: color, height: `${15 + ((v - min) / range) * 85}%` }]}
        />
      ))}
    </View>
  );
}

export function Sparkline({
  values,
  color,
  height = 24,
  style,
}: {
  values: number[];
  color: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  if (values.length < 2) return null;
  return (
    <View
      style={style}
      accessibilityRole="image"
      accessibilityLabel={`Trend: ${values[0]} to ${values[values.length - 1]}`}
    >
      <Bars values={values} color={color} height={height} />
    </View>
  );
}

export function TrendChart({
  values,
  color,
  format = (v) => String(v),
}: {
  values: number[];
  color: string;
  format?: (v: number) => string;
}) {
  const { currentTheme } = useTheme();
  if (values.length < 2) return null;
  const first = values[0];
  const last = values[values.length - 1];
  const delta = last - first;
  return (
    <View>
      <Bars values={values} color={color} height={72} />
      <View style={styles.axis}>
        <Text variant="caption" weight="400" tabular color={currentTheme.textSecondary}>{format(first)}</Text>
        <Text variant="caption" weight="400" tabular color={delta >= 0 ? currentTheme.primary : currentTheme.textSecondary}>
          {delta >= 0 ? '+' : ''}{format(delta)}
        </Text>
        <Text variant="caption" weight="700" tabular color={currentTheme.text}>{format(last)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.sm },
  bar: { borderRadius: RADIUS.xs, flex: 1 },
  bars: { alignItems: 'flex-end', flexDirection: 'row', gap: SPACING.xxs },
});

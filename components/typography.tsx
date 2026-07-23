import React from 'react';
import { Text as RNText, TextProps, TextStyle, StyleSheet } from 'react-native';
import { TYPE } from '../utils/tokens';

type Variant = keyof typeof TYPE;

export function Text({
  variant = 'body',
  color,
  tabular,
  weight,
  style,
  ...rest
}: TextProps & {
  variant?: Variant;
  color?: string;
  tabular?: boolean;
  weight?: TextStyle['fontWeight'];
}) {
  const t = TYPE[variant];
  return (
    <RNText
      maxFontSizeMultiplier={t.maxScale}
      style={[
        { fontSize: t.size, fontWeight: weight ?? t.weight, lineHeight: t.lineHeight },
        color ? { color } : null,
        tabular ? styles.tabular : null,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  tabular: { fontVariant: ['tabular-nums'] },
});

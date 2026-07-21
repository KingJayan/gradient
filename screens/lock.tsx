import React, { useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/use-theme';
import { useAppLock } from '../context/app-lock-context';
import { onPrimary } from '../utils/colors';
import { FONT, RADIUS, SPACING } from '../utils/tokens';

export default function LockScreen() {
  const { currentTheme } = useTheme();
  const { authenticate } = useAppLock();

  useEffect(() => {
    authenticate();
  }, [authenticate]);

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <View style={[styles.iconCircle, { backgroundColor: currentTheme.primary + '22' }]}>
        <Ionicons name="lock-closed" size={40} color={currentTheme.primary} />
      </View>
      <Text style={[styles.title, { color: currentTheme.text }]} accessibilityRole="header">Gradient is locked</Text>
      <Text style={[styles.subtitle, { color: currentTheme.textSecondary }]}>
        Authenticate to view your grades.
      </Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: currentTheme.primary }]}
        onPress={authenticate}
        accessibilityRole="button"
        accessibilityLabel="Unlock with biometrics"
      >
        <Ionicons name="finger-print" size={20} color={onPrimary(currentTheme.primary)} />
        <Text style={[styles.buttonText, { color: onPrimary(currentTheme.primary) }]}>Unlock</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.lg,
  },
  buttonText: { fontSize: FONT.lg, fontWeight: '600' },
  container: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: SPACING.xxxl },
  iconCircle: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    height: 96,
    justifyContent: 'center',
    marginBottom: SPACING.xxl,
    width: 96,
  },
  subtitle: { fontSize: FONT.base, marginBottom: SPACING.xxxl, textAlign: 'center' },
  title: { fontSize: FONT.xxl, fontWeight: '700', marginBottom: SPACING.sm },
});

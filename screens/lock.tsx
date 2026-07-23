import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/use-theme';
import { useAppLock } from '../context/app-lock-context';
import { RADIUS, SPACING } from '../utils/tokens';
import { Button } from '../components/screen';
import { Text } from '../components/typography';

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
      <Text variant="heading" color={currentTheme.text} style={styles.title} accessibilityRole="header">Gradient is locked</Text>
      <Text variant="body" color={currentTheme.textSecondary} style={styles.subtitle}>
        Authenticate to view your grades.
      </Text>
      <Button title="Unlock" icon="finger-print" onPress={authenticate} accessibilityLabel="Unlock with biometrics" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: SPACING.xxxl },
  iconCircle: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    height: 96,
    justifyContent: 'center',
    marginBottom: SPACING.xxl,
    width: 96,
  },
  subtitle: { marginBottom: SPACING.xxxl, textAlign: 'center' },
  title: { marginBottom: SPACING.sm },
});

import React, { useContext } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/auth-context';
import { useTheme } from '../hooks/use-theme';
import { useAppLock } from '../context/app-lock-context';
import { THEMES } from '../context/theme-context';
import { UI_COLORS, onPrimary } from '../utils/colors';
import { FONT, RADIUS, SPACING, TOUCH_TARGET } from '../utils/tokens';
import { Screen, ScreenHeader } from '../components/screen';

export default function SettingsScreen() {
  const authContext = useContext(AuthContext);
  const { currentTheme, themeName, setTheme, availableThemes } = useTheme();
  const { enabled: appLockEnabled, setEnabled: setAppLockEnabled, isSupported } = useAppLock();

  if (!authContext) return null;
  const { state, logout } = authContext;

  const handleAppLockToggle = async (value: boolean) => {
    if (value && !(await isSupported())) {
      Alert.alert(
        'Biometrics Unavailable',
        'Set up Face ID or a device passcode in your iOS settings to enable the app lock.'
      );
      return;
    }
    await setAppLockEnabled(value);
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', onPress: logout, style: 'destructive' },
    ]);
  };

  const handleThemeChange = async (name: string) => {
    await setTheme(name);
  };

  return (
    <Screen header={<ScreenHeader title="Settings" />}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentTheme.textSecondary }]} accessibilityRole="header">
            Appearance
          </Text>
          <View style={styles.themeGrid}>
            {availableThemes.map((theme) => {
              const themeColor = THEMES[theme]?.primary ?? currentTheme.primary;
              return (
                <TouchableOpacity
                  key={theme}
                  style={[
                    styles.themeOption,
                    {
                      backgroundColor: themeColor,
                      borderWidth: themeName === theme ? 2 : 0,
                      borderColor: currentTheme.text,
                    },
                  ]}
                  onPress={() => handleThemeChange(theme)}
                  accessibilityRole="button"
                  accessibilityLabel={`${theme.charAt(0).toUpperCase() + theme.slice(1)} theme`}
                  accessibilityState={{ selected: themeName === theme }}
                >
                  <Text style={[styles.themeOptionText, { color: onPrimary(themeColor) }]} maxFontSizeMultiplier={1.6}>
                    {theme.charAt(0).toUpperCase() + theme.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentTheme.textSecondary }]} accessibilityRole="header">
            Account
          </Text>
          <View style={[styles.accountCard, { backgroundColor: currentTheme.surface }]}>
            <View style={[styles.accountAvatar, { backgroundColor: currentTheme.primary }]}>
              <Ionicons name="person" size={32} color={onPrimary(currentTheme.primary)} />
            </View>
            <View style={styles.accountInfo}>
              <Text style={[styles.accountName, { color: currentTheme.text }]}>
                {state.user?.name || 'Student'}
              </Text>
              <Text style={[styles.accountEmail, { color: currentTheme.textSecondary }]}>
                {state.user?.username}
              </Text>
              <Text style={[styles.accountDistrict, { color: currentTheme.primary }]}>
                {state.user?.hacUrl.split('/')[2].split('.')[0] || 'District'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentTheme.textSecondary }]} accessibilityRole="header">
            Security
          </Text>
          <View style={[styles.lockRow, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.lockInfo}>
              <Ionicons name="finger-print" size={22} color={currentTheme.primary} />
              <View style={styles.lockText}>
                <Text style={[styles.lockTitle, { color: currentTheme.text }]}>App Lock</Text>
                <Text style={[styles.lockSubtitle, { color: currentTheme.textSecondary }]}>
                  Require Face ID to open Gradient
                </Text>
              </View>
            </View>
            <Switch
              value={appLockEnabled}
              onValueChange={handleAppLockToggle}
              trackColor={{ false: currentTheme.border, true: currentTheme.primary }}
              accessibilityLabel="Require Face ID to open the app"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentTheme.textSecondary }]} accessibilityRole="header">
            About
          </Text>
          <View style={[styles.infoItem, { backgroundColor: currentTheme.surface }]}>
            <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>Version</Text>
            <Text style={[styles.infoValue, { color: currentTheme.text }]}>1.0.0</Text>
          </View>
          <View style={[styles.infoItem, { backgroundColor: currentTheme.surface }]}>
            <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>Build</Text>
            <Text style={[styles.infoValue, { color: currentTheme.text }]}>1</Text>
          </View>
          <View style={[styles.infoItem, { backgroundColor: currentTheme.surface }]}>
            <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>Powered by</Text>
            <Text style={[styles.infoValue, { color: currentTheme.text }]}>HAC API</Text>
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: UI_COLORS.danger }]}
            onPress={handleLogout}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <Ionicons name="log-out" size={20} color={UI_COLORS.white} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: currentTheme.primary }]}>Gradient</Text>
          <Text style={[styles.footerSubtext, { color: currentTheme.textSecondary }]}>
            Your grades, visualized
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  accountAvatar: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    height: 56,
    justifyContent: 'center',
    marginRight: SPACING.lg,
    width: 56,
  },
  accountCard: {
    alignItems: 'center',
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  accountDistrict: {
    fontSize: FONT.sm,
    fontWeight: '500',
    marginTop: SPACING.xs,
  },
  accountEmail: {
    fontSize: FONT.md,
    marginTop: SPACING.xs,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: FONT.lg,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xxxl,
  },
  footerSubtext: {
    fontSize: FONT.sm,
    marginTop: SPACING.xs,
  },
  footerText: {
    fontSize: FONT.xl,
    fontWeight: '700',
  },
  infoItem: {
    alignItems: 'center',
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  infoLabel: {
    fontSize: FONT.base,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: FONT.base,
    fontWeight: '600',
  },
  lockInfo: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: SPACING.md },
  lockRow: {
    alignItems: 'center',
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  lockSubtitle: { fontSize: FONT.sm, marginTop: SPACING.xxs },
  lockText: { flex: 1 },
  lockTitle: { fontSize: FONT.lg, fontWeight: '600' },
  logoutButton: {
    alignItems: 'center',
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    gap: SPACING.sm,
    justifyContent: 'center',
    minHeight: TOUCH_TARGET,
  },
  logoutText: {
    color: UI_COLORS.white,
    fontSize: FONT.lg,
    fontWeight: '600',
  },
  section: {
    borderBottomWidth: 8,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT.base,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  themeOption: {
    alignItems: 'center',
    borderRadius: RADIUS.md,
    flex: 1,
    justifyContent: 'center',
    minHeight: TOUCH_TARGET,
    minWidth: '30%',
  },
  themeOptionText: {
    fontSize: FONT.xs,
    fontWeight: '600',
  },
});

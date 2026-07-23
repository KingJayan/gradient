import React, { useContext, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { setAlternateAppIcon, supportsAlternateIcons } from 'expo-alternate-app-icons';
import * as StoreReview from 'expo-store-review';
import { AuthContext } from '../context/auth-context';
import { useTheme } from '../hooks/use-theme';
import { useAppLock } from '../context/app-lock-context';
import { THEMES } from '../context/theme-context';
import { applyUpdate, currentUpdateLabel, fetchUpdate, OTA_ENABLED } from '../hooks/use-updates';
import { UI_COLORS, onPrimary } from '../utils/colors';
import { districtName } from '../utils/district';
import { APP_VERSION, BUILD_NUMBER, SUPPORT_URL, openLink } from '../utils/links';
import { logWarning } from '../utils/error-logger';
import { RADIUS, SPACING, TOUCH_TARGET } from '../utils/tokens';
import { Screen, ScreenHeader, Card, ListRow, Button } from '../components/screen';
import { Text } from '../components/typography';
import { selectionHaptic } from '../utils/haptics';
import { DEFAULT_PREFS, NotifPrefs, loadPrefs, savePrefs } from '../services/notifications';

const THRESHOLDS = [1, 3, 5];

const UPDATE_MESSAGES = {
  downloaded: 'An update is ready. Restart Gradient to apply it.',
  current: "You're on the latest version.",
  unsupported: 'Over-the-air updates are unavailable in this build.',
  failed: 'Could not check for updates. Try again when you have a connection.',
} as const;

export default function SettingsScreen() {
  const authContext = useContext(AuthContext);
  const navigation = useNavigation();
  const { currentTheme, themeName, setTheme, availableThemes, appearance, availableAppearances, setAppearance, scheme } =
    useTheme();
  const { enabled: appLockEnabled, setEnabled: setAppLockEnabled, isSupported } = useAppLock();
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    loadPrefs().then(setNotifPrefs);
  }, []);

  const updateNotifPrefs = (patch: Partial<NotifPrefs>) => {
    setNotifPrefs((prev) => {
      const next = { ...prev, ...patch };
      savePrefs(next);
      return next;
    });
  };

  if (!authContext) return null;
  const { state, logout, deleteAccount } = authContext;

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

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This erases your saved credentials, cached grades, and personal tasks from this device. Your Home Access Center account belongs to your district and is not affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Everything', onPress: deleteAccount, style: 'destructive' },
      ]
    );
  };

  const handleThemeChange = async (name: string) => {
    await setTheme(name);
    if (!supportsAlternateIcons) return;
    try {
      await setAlternateAppIcon(name.charAt(0).toUpperCase() + name.slice(1));
    } catch (e) {
      logWarning('app icon change failed', { themeName: name, error: e instanceof Error ? e.message : String(e) });
    }
  };

  const handleRate = async () => {
    if (await StoreReview.isAvailableAsync()) {
      await StoreReview.requestReview();
      return;
    }
    const url = StoreReview.storeUrl();
    if (url) openLink(url);
  };

  const handleCheckForUpdates = async () => {
    const result = await fetchUpdate();
    Alert.alert(
      'Updates',
      UPDATE_MESSAGES[result],
      result === 'downloaded'
        ? [{ text: 'Later', style: 'cancel' }, { text: 'Restart', onPress: applyUpdate }]
        : [{ text: 'OK' }]
    );
  };

  return (
    <Screen header={<ScreenHeader title="Settings" />}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text variant="caption" weight="700" color={currentTheme.textSecondary} style={styles.sectionTitle} accessibilityRole="header">
            Appearance
          </Text>
          <View style={styles.appearanceRow} accessibilityRole="radiogroup">
            {availableAppearances.map((option) => {
              const selected = option === appearance;
              const preview = THEMES[themeName][option === 'system' ? scheme : option];
              return (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.appearanceChip,
                    {
                      backgroundColor: preview.background,
                      borderColor: selected ? preview.primary : preview.border,
                      borderWidth: selected ? 2 : 1,
                    },
                  ]}
                  onPress={() => { selectionHaptic(); setAppearance(option); }}
                  accessibilityRole="radio"
                  accessibilityLabel={`${option.charAt(0).toUpperCase() + option.slice(1)} appearance`}
                  accessibilityState={{ checked: selected }}
                >
                  <View style={[styles.appearanceSwatch, { backgroundColor: preview.primary }]} />
                  <Text variant="caption" weight="600" color={preview.text}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.themeGrid}>
            {availableThemes.map((theme) => {
              const themeColor = THEMES[theme][scheme].primary;
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
                  <Text variant="caption" weight="600" color={onPrimary(themeColor)}>
                    {theme.charAt(0).toUpperCase() + theme.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="caption" weight="700" color={currentTheme.textSecondary} style={styles.sectionTitle} accessibilityRole="header">
            Account
          </Text>
          <Card style={styles.accountCard}>
            <View style={[styles.accountAvatar, { backgroundColor: currentTheme.primary }]}>
              <Ionicons name="person" size={32} color={onPrimary(currentTheme.primary)} />
            </View>
            <View style={styles.accountInfo}>
              <Text variant="body" weight="600" color={currentTheme.text}>
                {state.user?.name || 'Student'}
              </Text>
              <Text variant="subhead" color={currentTheme.textSecondary} style={styles.accountEmail}>
                {state.user?.username}
              </Text>
              <Text variant="subhead" weight="500" color={currentTheme.primary} style={styles.accountDistrict}>
                {districtName(state.user?.hacUrl)}
              </Text>
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Text variant="caption" weight="700" color={currentTheme.textSecondary} style={styles.sectionTitle} accessibilityRole="header">
            Security
          </Text>
          <ListRow
            leadingIcon="finger-print"
            title="App Lock"
            subtitle="Require Face ID to open Gradient"
            trailing={
              <Switch
                value={appLockEnabled}
                onValueChange={handleAppLockToggle}
                trackColor={{ false: currentTheme.border, true: currentTheme.primary }}
                accessibilityLabel="Require Face ID to open the app"
              />
            }
          />
        </View>

        <View style={styles.section}>
          <Text variant="caption" weight="700" color={currentTheme.textSecondary} style={styles.sectionTitle} accessibilityRole="header">
            Notifications
          </Text>
          <ListRow
            title="Grade increases"
            subtitle="Alert me when an average goes up"
            trailing={
              <Switch
                value={notifPrefs.increases}
                onValueChange={(v) => updateNotifPrefs({ increases: v })}
                trackColor={{ false: currentTheme.border, true: currentTheme.primary }}
                accessibilityLabel="Notify on grade increases"
              />
            }
          />
          <ListRow
            title="Grade drops"
            subtitle="Alert me when an average goes down"
            trailing={
              <Switch
                value={notifPrefs.drops}
                onValueChange={(v) => updateNotifPrefs({ drops: v })}
                trackColor={{ false: currentTheme.border, true: currentTheme.primary }}
                accessibilityLabel="Notify on grade drops"
              />
            }
          />
          <View style={styles.thresholdRow} accessibilityRole="radiogroup">
            {THRESHOLDS.map((pts) => {
              const selected = notifPrefs.threshold === pts;
              return (
                <TouchableOpacity
                  key={pts}
                  style={[
                    styles.thresholdChip,
                    {
                      backgroundColor: selected ? currentTheme.primary : currentTheme.surface,
                      borderColor: selected ? currentTheme.primary : currentTheme.border,
                    },
                  ]}
                  onPress={() => { selectionHaptic(); updateNotifPrefs({ threshold: pts }); }}
                  accessibilityRole="radio"
                  accessibilityLabel={`Notify on changes of at least ${pts} point${pts === 1 ? '' : 's'}`}
                  accessibilityState={{ checked: selected }}
                >
                  <Text variant="body" weight="600" color={selected ? onPrimary(currentTheme.primary) : currentTheme.text}>
                    ≥ {pts} pt{pts === 1 ? '' : 's'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <ListRow
            title="System Settings"
            trailing={<Ionicons name="open-outline" size={18} color={currentTheme.textSecondary} />}
            onPress={() => openLink('app-settings:')}
            accessibilityRole="link"
            accessibilityLabel="Open system notification settings"
          />
          <Text variant="subhead" color={currentTheme.textSecondary} style={styles.notifNote}>
            Turn notifications on or off and choose how they&apos;re delivered in iOS Settings.
          </Text>
        </View>

        <View style={styles.section}>
          <Text variant="caption" weight="700" color={currentTheme.textSecondary} style={styles.sectionTitle} accessibilityRole="header">
            Support
          </Text>
          <ListRow
            title="Get Help"
            trailing={<Ionicons name="open-outline" size={18} color={currentTheme.textSecondary} />}
            onPress={() => openLink(SUPPORT_URL)}
            accessibilityRole="link"
            accessibilityLabel="Get help and report a problem"
          />
          <ListRow
            title="Rate Gradient"
            trailing={<Ionicons name="star-outline" size={18} color={currentTheme.textSecondary} />}
            onPress={handleRate}
            accessibilityLabel="Rate Gradient on the App Store"
          />
          <ListRow
            title="Privacy Policy"
            trailing={<Ionicons name="chevron-forward" size={18} color={currentTheme.textSecondary} />}
            onPress={() => navigation.navigate('Privacy' as never)}
            accessibilityLabel="Read the privacy policy"
          />
          <ListRow
            title="Check for Updates"
            trailing={<Ionicons name="refresh" size={18} color={currentTheme.textSecondary} />}
            onPress={handleCheckForUpdates}
            accessibilityLabel="Check for updates"
          />
        </View>

        <View style={styles.section}>
          <Text variant="caption" weight="700" color={currentTheme.textSecondary} style={styles.sectionTitle} accessibilityRole="header">
            About
          </Text>
          <ListRow
            title="Version"
            titleColor={currentTheme.textSecondary}
            trailing={<Text variant="body" weight="600" color={currentTheme.text}>{APP_VERSION} ({BUILD_NUMBER})</Text>}
          />
          {OTA_ENABLED && (
            <ListRow
              title="Update"
              titleColor={currentTheme.textSecondary}
              trailing={<Text variant="body" weight="600" color={currentTheme.text}>{currentUpdateLabel()}</Text>}
            />
          )}
          <ListRow
            title="Powered by"
            titleColor={currentTheme.textSecondary}
            trailing={<Text variant="body" weight="600" color={currentTheme.text}>HAC API</Text>}
          />
        </View>

        <View style={styles.section}>
          <Button title="Sign Out" variant="danger" icon="log-out" onPress={handleLogout} accessibilityLabel="Sign out" />
          <Button
            title="Delete Account"
            variant="outline"
            color={UI_COLORS.danger}
            icon="trash"
            onPress={handleDeleteAccount}
            style={styles.deleteButton}
            accessibilityLabel="Delete account and erase all data on this device"
          />
        </View>

        <View style={styles.footer}>
          <Text variant="heading" color={currentTheme.primary}>Gradient</Text>
          <Text variant="subhead" color={currentTheme.textSecondary} style={styles.footerSubtext}>
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
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  accountDistrict: {
    marginTop: SPACING.xs,
  },
  accountEmail: {
    marginTop: SPACING.xs,
  },
  accountInfo: {
    flex: 1,
  },
  appearanceChip: {
    alignItems: 'center',
    borderRadius: RADIUS.md,
    flex: 1,
    gap: SPACING.xs,
    justifyContent: 'center',
    minHeight: TOUCH_TARGET * 1.4,
  },
  appearanceRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  appearanceSwatch: { borderRadius: RADIUS.pill, height: SPACING.lg, width: SPACING.xxxl },
  deleteButton: {
    marginTop: SPACING.md,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xxxl,
  },
  footerSubtext: {
    marginTop: SPACING.xs,
  },
  notifNote: { lineHeight: 18, marginTop: SPACING.sm },
  section: {
    borderBottomWidth: 8,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  sectionTitle: {
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
  thresholdChip: {
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: TOUCH_TARGET,
  },
  thresholdRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.sm, marginTop: SPACING.md },
});

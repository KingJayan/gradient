import React, { useState, useContext, useRef, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/auth-context';
import { DEMO_CREDENTIALS, DEMO_MODE } from '../services/api/demo';
import { useTheme } from '../hooks/use-theme';
import { UI_COLORS } from '../utils/colors';
import { RADIUS, SPACING, TOUCH_TARGET, TYPE } from '../utils/tokens';
import { Button } from '../components/screen';
import { Text } from '../components/typography';
import { selectionHaptic } from '../utils/haptics';
import { DISTRICTS, isValidHacUrl, normalizeHacUrl, searchDistricts } from '../utils/district';
import { fetchProfiles, HACProfile } from '../hooks/use-auth';

const MAX_RESULTS = 8;

interface PendingCreds {
  username: string;
  password: string;
  hacUrl: string;
}

export default function LoginScreen() {
  const authContext = useContext(AuthContext);
  const { currentTheme } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [query, setQuery] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(DISTRICTS[0].id);
  const [manual, setManual] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingProfiles, setPendingProfiles] = useState<HACProfile[] | null>(null);
  const [pendingCreds, setPendingCreds] = useState<PendingCreds | null>(null);

  const results = useMemo(() => searchDistricts(query).slice(0, MAX_RESULTS), [query]);
  const selectedDistrict = DISTRICTS.find((d) => d.id === selectedDistrictId);
  const customValid = isValidHacUrl(customUrl);
  const hacUrl = manual ? normalizeHacUrl(customUrl) : selectedDistrict?.url ?? '';

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const completeSignIn = async (user: string, pass: string, url: string, profileId?: string, profileName?: string) => {
    try {
      await authContext!.login(user, pass, url, profileId, profileName);
    } catch (error) {
      Alert.alert(
        "Couldn't Sign In",
        error instanceof Error ? error.message : 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
      setPendingProfiles(null);
      setPendingCreds(null);
    }
  };

  const signIn = async (user: string, pass: string, url: string) => {
    setLoading(true);
    try {
      const profiles = await fetchProfiles(user, pass, url);
      if (profiles.length > 1) {
        setPendingCreds({ username: user, password: pass, hacUrl: url });
        setPendingProfiles(profiles);
        setLoading(false);
        return;
      }
      // Pass the name from the single profile so we skip the /name round-trip.
      await completeSignIn(user, pass, url, profiles[0]?.id, profiles[0]?.name);
    } catch {
      setLoading(false);
      Alert.alert("Couldn't Sign In", 'Something went wrong. Please try again.');
    }
  };

  const selectProfile = (profileId: string) => {
    if (!pendingCreds || !pendingProfiles) return;
    const profile = pendingProfiles.find((p) => p.id === profileId);
    selectionHaptic();
    setLoading(true);
    completeSignIn(pendingCreds.username, pendingCreds.password, pendingCreds.hacUrl, profileId, profile?.name);
  };

  const handleLogin = () => {
    if (!username || !password) {
      Alert.alert('Missing Details', 'Enter the username and password you use for Home Access Center.');
      return;
    }
    if (manual) {
      if (!customValid) {
        Alert.alert('Check the URL', "Enter a valid https:// address for your district's Home Access Center.");
        return;
      }
    } else if (!hacUrl) {
      Alert.alert('Missing District', 'Search for your district or enter its Home Access Center URL.');
      return;
    }
    signIn(username, password, hacUrl);
  };

  const handleDemo = () =>
    signIn(DEMO_CREDENTIALS.username, DEMO_CREDENTIALS.password, DEMO_CREDENTIALS.hacUrl);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: currentTheme.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <View style={styles.logoContainer}>
            <Ionicons name="school" size={48} color={currentTheme.primary} />
          </View>
          <Text variant="hero" weight="700" color={currentTheme.primary} style={styles.title} accessibilityRole="header">Gradient</Text>
          <Text variant="body" color={currentTheme.textSecondary}>Your grades, visualized</Text>
        </Animated.View>

        <Animated.View style={[styles.form, { opacity: fadeAnim }]}>
          <Text variant="body" weight="600" color={currentTheme.text} style={styles.label}>School District</Text>
          <View style={styles.districtContainer}>
            {manual ? (
              <>
                <View style={[styles.inputContainer, { backgroundColor: currentTheme.surface, borderColor: customUrl && !customValid ? UI_COLORS.danger : currentTheme.border }]}>
                  <Ionicons name="globe" size={20} color={currentTheme.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: currentTheme.text }]}
                    placeholder="https://homeaccess.yourisd.org/"
                    placeholderTextColor={currentTheme.textSecondary}
                    value={customUrl}
                    onChangeText={setCustomUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    editable={!loading}
                    accessibilityLabel="District home access URL"
                  />
                </View>
                {customUrl.length > 0 && !customValid && (
                  <Text variant="subhead" color={UI_COLORS.danger} style={styles.hintText}>
                    Enter a full https:// web address.
                  </Text>
                )}
                <TouchableOpacity
                  style={styles.linkRow}
                  onPress={() => setManual(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Back to district search"
                >
                  <Ionicons name="chevron-back" size={16} color={currentTheme.primary} />
                  <Text variant="body" weight="600" color={currentTheme.primary}>Search districts instead</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={[styles.inputContainer, { backgroundColor: currentTheme.surface, borderColor: currentTheme.border }]}>
                  <Ionicons name="search" size={20} color={currentTheme.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: currentTheme.text }]}
                    placeholder="Search your district"
                    placeholderTextColor={currentTheme.textSecondary}
                    value={query}
                    onChangeText={setQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                    accessibilityLabel="Search districts"
                  />
                </View>
                <View accessibilityRole="radiogroup">
                  {results.map((district) => {
                    const checked = selectedDistrictId === district.id;
                    return (
                      <TouchableOpacity
                        key={district.id}
                        style={[styles.districtButton, { borderColor: currentTheme.border, backgroundColor: checked ? currentTheme.primary : currentTheme.surface }]}
                        onPress={() => { selectionHaptic(); setSelectedDistrictId(district.id); }}
                        accessibilityRole="radio"
                        accessibilityLabel={district.name}
                        accessibilityState={{ checked }}
                      >
                        <Ionicons
                          name={checked ? 'checkmark-circle' : 'ellipse-outline'}
                          size={20}
                          color={checked ? UI_COLORS.white : currentTheme.textSecondary}
                        />
                        <Text variant="body" weight="500" color={checked ? UI_COLORS.white : currentTheme.text} style={styles.districtButtonText}>
                          {district.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  {results.length === 0 && (
                    <Text variant="subhead" color={currentTheme.textSecondary} style={styles.hintText}>
                      No matches. Enter your district URL manually.
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.linkRow}
                  onPress={() => { setManual(true); setSelectedDistrictId(null); }}
                  accessibilityRole="button"
                  accessibilityLabel="Enter district URL manually"
                >
                  <Ionicons name="globe-outline" size={16} color={currentTheme.primary} />
                  <Text variant="body" weight="600" color={currentTheme.primary}>My district isn&apos;t listed</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <Text variant="body" weight="600" color={currentTheme.text} style={styles.label}>Username</Text>
          <View style={[styles.inputContainer, { backgroundColor: currentTheme.surface, borderColor: currentTheme.border }]}>
            <Ionicons name="person" size={20} color={currentTheme.textSecondary} />
            <TextInput
              style={[styles.input, { color: currentTheme.text }]}
              placeholder="Enter username"
              value={username}
              onChangeText={setUsername}
              editable={!loading}
              placeholderTextColor={currentTheme.textSecondary}
              autoCapitalize="none"
              accessibilityLabel="Username"
            />
          </View>

          <Text variant="body" weight="600" color={currentTheme.text} style={styles.label}>Password</Text>
          <View style={[styles.inputContainer, { backgroundColor: currentTheme.surface, borderColor: currentTheme.border }]}>
            <Ionicons name="lock-closed" size={20} color={currentTheme.textSecondary} />
            <TextInput
              style={[styles.input, { color: currentTheme.text }]}
              placeholder="Enter password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
              placeholderTextColor={currentTheme.textSecondary}
              autoCapitalize="none"
              accessibilityLabel="Password"
            />
          </View>

          <Button
            title="Sign In"
            icon="log-in"
            onPress={handleLogin}
            loading={loading}
            style={styles.loginButton}
            accessibilityLabel={loading ? 'Signing in' : 'Sign in'}
          />

          {DEMO_MODE && (
            <Button
              title="Explore the demo account"
              variant="outline"
              color={currentTheme.textSecondary}
              onPress={handleDemo}
              disabled={loading}
              style={styles.demoButton}
            />
          )}
        </Animated.View>

        <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
          <Text variant="subhead" color={currentTheme.textSecondary} style={styles.footerText}>
            Your HAC credentials are stored on-device in iOS Keychain and sent over HTTPS to the Gradient API proxy to fetch your grades. They are not stored by the proxy.
          </Text>
        </Animated.View>
      </ScrollView>

      {pendingProfiles && (
        <View style={styles.pickerOverlay} accessibilityViewIsModal>
          <View style={[styles.pickerSheet, { backgroundColor: currentTheme.surface }]}>
            <Text variant="heading" weight="600" color={currentTheme.text} style={styles.pickerTitle}>
              Select Student
            </Text>
            <Text variant="body" color={currentTheme.textSecondary} style={styles.pickerSubtitle}>
              This account has multiple students. Choose who to view.
            </Text>
            <View accessibilityRole="radiogroup">
              {pendingProfiles.map((profile) => (
                <TouchableOpacity
                  key={profile.id}
                  style={[styles.profileButton, { borderColor: currentTheme.border, backgroundColor: currentTheme.background }]}
                  onPress={() => selectProfile(profile.id)}
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${profile.name}`}
                >
                  <Ionicons name="person-circle-outline" size={24} color={currentTheme.primary} />
                  <Text variant="body" weight="500" color={currentTheme.text} style={styles.profileName}>
                    {profile.name}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={currentTheme.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.pickerCancel}
              onPress={() => { setPendingProfiles(null); setPendingCreds(null); }}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text variant="body" weight="600" color={currentTheme.textSecondary}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  demoButton: {
    marginTop: SPACING.md,
  },
  districtButton: {
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: SPACING.sm,
    minHeight: TOUCH_TARGET,
    paddingHorizontal: SPACING.lg,
  },
  districtButtonText: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  districtContainer: {
    marginBottom: SPACING.xxl,
  },
  footer: {
    marginTop: SPACING.huge,
  },
  footerText: {
    textAlign: 'center',
  },
  form: {
    marginBottom: SPACING.huge,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.huge,
    marginTop: SPACING.giant,
  },
  hintText: {
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  input: {
    flex: 1,
    fontSize: TYPE.body.size,
    marginLeft: SPACING.md,
    minHeight: TOUCH_TARGET,
  },
  inputContainer: {
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  label: {
    marginBottom: SPACING.sm,
  },
  linkRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
    minHeight: TOUCH_TARGET,
  },
  loginButton: {
    marginTop: SPACING.xxl,
  },
  logoContainer: {
    marginBottom: SPACING.lg,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    padding: SPACING.xl,
  },
  title: {
    marginBottom: SPACING.xs,
  },
  pickerOverlay: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    bottom: 0,
    justifyContent: 'flex-end',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  pickerSheet: {
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    padding: SPACING.xl,
    paddingBottom: SPACING.huge,
  },
  pickerTitle: {
    marginBottom: SPACING.sm,
  },
  pickerSubtitle: {
    marginBottom: SPACING.xl,
  },
  profileButton: {
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
    minHeight: TOUCH_TARGET,
    paddingHorizontal: SPACING.lg,
  },
  profileName: {
    flex: 1,
  },
  pickerCancel: {
    alignItems: 'center',
    marginTop: SPACING.lg,
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
  },
});

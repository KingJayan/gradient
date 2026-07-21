import React, { useState, useContext, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/auth-context';
import { DEMO_CREDENTIALS, DEMO_MODE } from '../services/api/demo';
import { useTheme } from '../hooks/use-theme';
import { UI_COLORS } from '../utils/colors';
import { FONT, RADIUS, SPACING, TOUCH_TARGET } from '../utils/tokens';

const DISTRICTS = [
  { id: 'frisco', name: 'Frisco ISD', url: 'https://homeaccess.friscoisd.org/' },
  { id: 'cfisd', name: 'Cypress ISD', url: 'https://homeaccess.cfisd.net/' },
  { id: 'rrisd', name: 'Round Rock ISD', url: 'https://homeaccess.rrisd.org/' },
  { id: 'austin', name: 'Austin ISD', url: 'https://homeaccess.austinisd.org/' },
  { id: 'other', name: 'Other District', url: '' },
];

export default function LoginScreen() {
  const authContext = useContext(AuthContext);
  const { currentTheme } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState(DISTRICTS[0].id);
  const [customUrl, setCustomUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const hacUrl = selectedDistrictId === 'other'
    ? customUrl.trim()
    : DISTRICTS.find((d) => d.id === selectedDistrictId)!.url;
  // useRef keeps the same Animated.Value across renders
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const signIn = async (user: string, pass: string, url: string) => {
    setLoading(true);
    try {
      await authContext!.login(user, pass, url);
    } catch (error) {
      Alert.alert(
        "Couldn't Sign In",
        error instanceof Error ? error.message : 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    if (!username || !password) {
      Alert.alert('Missing Details', 'Enter the username and password you use for Home Access Center.');
      return;
    }
    if (!hacUrl) {
      Alert.alert('Missing District', "Enter your district's Home Access Center URL.");
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
          <Text style={[styles.title, { color: currentTheme.primary }]} accessibilityRole="header">Gradient</Text>
          <Text style={[styles.subtitle, { color: currentTheme.textSecondary }]}>Your grades, visualized</Text>
        </Animated.View>

        <Animated.View style={[styles.form, { opacity: fadeAnim }]}>
          <Text style={[styles.label, { color: currentTheme.text }]}>School District</Text>
          <View style={styles.districtContainer} accessibilityRole="radiogroup">
            {DISTRICTS.map((district) => (
              <TouchableOpacity
                key={district.id}
                style={[
                  styles.districtButton,
                  {
                    borderColor: currentTheme.border,
                    backgroundColor: selectedDistrictId === district.id ? currentTheme.primary : currentTheme.surface,
                  }
                ]}
                onPress={() => setSelectedDistrictId(district.id)}
                accessibilityRole="radio"
                accessibilityLabel={district.name}
                accessibilityState={{ checked: selectedDistrictId === district.id }}
              >
                <Ionicons
                  name={selectedDistrictId === district.id ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={selectedDistrictId === district.id ? UI_COLORS.white : currentTheme.textSecondary}
                />
                <Text
                  style={[
                    styles.districtButtonText,
                    { color: selectedDistrictId === district.id ? UI_COLORS.white : currentTheme.text }
                  ]}
                >
                  {district.name}
                </Text>
              </TouchableOpacity>
            ))}
            {selectedDistrictId === 'other' && (
              <View style={[styles.inputContainer, { backgroundColor: currentTheme.surface, borderColor: currentTheme.border, marginTop: SPACING.sm }]}>
                <Ionicons name="globe" size={20} color={currentTheme.textSecondary} />
                <TextInput
                  style={[styles.input, { color: currentTheme.text }]}
                  placeholder="https://homeaccess.yourisd.org/"
                  placeholderTextColor={currentTheme.textSecondary}
                  value={customUrl}
                  onChangeText={setCustomUrl}
                  autoCapitalize="none"
                  keyboardType="url"
                  editable={!loading}
                  accessibilityLabel="District home access URL"
                />
              </View>
            )}
          </View>

          <Text style={[styles.label, { color: currentTheme.text }]}>Username</Text>
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

          <Text style={[styles.label, { color: currentTheme.text }]}>Password</Text>
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

          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: currentTheme.primary }, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={loading ? 'Signing in' : 'Sign in'}
            accessibilityState={{ disabled: loading, busy: loading }}
          >
            {loading ? (
              <ActivityIndicator color={UI_COLORS.white} />
            ) : (
              <>
                <Ionicons name="log-in" size={20} color={UI_COLORS.white} />
                <Text style={styles.loginButtonText}>Sign In</Text>
              </>
            )}
          </TouchableOpacity>

          {DEMO_MODE && (
            <TouchableOpacity
              style={[styles.demoButton, { borderColor: currentTheme.border }]}
              onPress={handleDemo}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Explore the demo account"
              accessibilityState={{ disabled: loading }}
            >
              <Text style={[styles.demoButtonText, { color: currentTheme.textSecondary }]}>
                Explore the demo account
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
          <Text style={[styles.footerText, { color: currentTheme.textSecondary }]}>
            Your HAC credentials are stored on-device in iOS Keychain and sent over HTTPS to the Gradient API proxy to fetch your grades. They are not stored by the proxy.
          </Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  demoButton: {
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: SPACING.md,
    minHeight: TOUCH_TARGET,
  },
  demoButtonText: {
    fontSize: FONT.base,
    fontWeight: '500',
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
    fontSize: FONT.base,
    fontWeight: '500',
    marginLeft: SPACING.md,
  },
  districtContainer: {
    marginBottom: SPACING.xxl,
  },
  footer: {
    marginTop: SPACING.huge,
  },
  footerText: {
    fontSize: FONT.sm,
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
  input: {
    flex: 1,
    fontSize: FONT.lg,
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
    fontSize: FONT.base,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  loginButton: {
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.xxl,
    minHeight: TOUCH_TARGET,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: UI_COLORS.white,
    fontSize: FONT.lg,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
  logoContainer: {
    marginBottom: SPACING.lg,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    padding: SPACING.xl,
  },
  subtitle: {
    fontSize: FONT.base,
  },
  title: {
    fontSize: FONT.hero,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
});

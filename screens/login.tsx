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
import { useTheme } from '../hooks/use-theme';
import { UI_COLORS } from '../utils/colors';

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

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }
    if (!hacUrl) {
      Alert.alert('Error', 'Please enter your district URL');
      return;
    }
    setLoading(true);
    try {
      await authContext!.login(username, password, hacUrl);
    } catch (error) {
      Alert.alert('Login Failed', error instanceof Error ? error.message : 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

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
              <View style={[styles.inputContainer, { backgroundColor: currentTheme.surface, borderColor: currentTheme.border, marginTop: 8 }]}>
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
  districtButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 8,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  districtButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 12,
  },
  districtContainer: {
    marginBottom: 24,
  },
  footer: {
    marginTop: 40,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
  },
  form: {
    marginBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 60,
  },
  input: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
    paddingVertical: 12,
  },
  inputContainer: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  loginButton: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    paddingVertical: 14,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: UI_COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  logoContainer: {
    marginBottom: 16,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  subtitle: {
    fontSize: 14,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
});

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { AuthContext } from './context/auth-context';
import { ThemeProvider } from './context/theme-context';
import { DataProvider } from './context/data-context';
import { AppLockProvider, useAppLock } from './context/app-lock-context';
import { ErrorBoundary } from './components/error-boundary';
import { useAuth } from './hooks/use-auth';
import { useTheme } from './hooks/use-theme';
import { useServiceStatus } from './hooks/use-service-status';
import { useAutoUpdate } from './hooks/use-updates';
import { ServiceStatus } from './services/api/health';
import { districtName } from './utils/district';
import { UI_COLORS } from './utils/colors';
import { initMonitoring, wrapRoot } from './utils/monitoring';
import { FONT, RADIUS, SPACING } from './utils/tokens';
import { mark, measure } from './utils/perf';

mark('coldStart:start');
initMonitoring();

import LoadingScreen from './screens/loading';
import LockScreen from './screens/lock';
import LoginScreen from './screens/login';
import HomeScreen from './screens/home';
import GradesScreen from './screens/grades';
import PlannerScreen from './screens/planner';
import SettingsScreen from './screens/settings';
import GPACalculatorScreen from './screens/gpa-calc';
import ScheduleScreen from './screens/schedule';
import TranscriptScreen from './screens/transcript';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function withBoundary<P extends object>(Component: React.ComponentType<P>) {
  return function BoundedScreen(props: P) {
    return (
      <ErrorBoundary>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

const Home = withBoundary(HomeScreen);
const Grades = withBoundary(GradesScreen);
const GPA = withBoundary(GPACalculatorScreen);
const Schedule = withBoundary(ScheduleScreen);
const Planner = withBoundary(PlannerScreen);
const Settings = withBoundary(SettingsScreen);
const Transcript = withBoundary(TranscriptScreen);

function AuthStack() {
  const { currentTheme } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: currentTheme.background },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

function AppTabs() {
  const { currentTheme } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'ellipse-outline';
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Grades') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'GPA') {
            iconName = focused ? 'calculator' : 'calculator-outline';
          } else if (route.name === 'Planner') {
            iconName = focused ? 'checkbox' : 'checkbox-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: currentTheme.primary,
        tabBarInactiveTintColor: currentTheme.textSecondary,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: currentTheme.surface,
          borderTopWidth: 1,
          borderTopColor: currentTheme.border,
          paddingBottom: SPACING.sm,
          paddingTop: SPACING.sm,
        },
      })}
    >
      <Tab.Screen name="Home" component={Home} options={{ title: 'Home' }} />
      <Tab.Screen name="Grades" component={Grades} options={{ title: 'Grades' }} />
      <Tab.Screen name="GPA" component={GPA} options={{ title: 'GPA' }} />
      <Tab.Screen name="Planner" component={Planner} options={{ title: 'Planner' }} />
      <Tab.Screen name="Settings" component={Settings} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}

function AppStack() {
  const { currentTheme } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: currentTheme.background },
      }}
    >
      <Stack.Screen name="Tabs" component={AppTabs} />
      <Stack.Screen name="Schedule" component={Schedule} options={{ presentation: 'modal' }} />
      <Stack.Screen name="Transcript" component={Transcript} options={{ presentation: 'modal' }} />
    </Stack.Navigator>
  );
}

function RootNavigatorContent() {
  const { state, bootstrapAsync, login, logout, deleteAccount } = useAuth();
  const { currentTheme } = useTheme();
  const [isBootstrapped, setIsBootstrapped] = useState(false);

  useAutoUpdate();

  useEffect(() => {
    bootstrapAsync().then(() => setIsBootstrapped(true));
  }, [bootstrapAsync]);

  useEffect(() => {
    if (isBootstrapped) measure('coldStart', 'coldStart:start');
  }, [isBootstrapped]);

  if (!isBootstrapped || !currentTheme) return <LoadingScreen />;

  return (
    <AuthContext.Provider value={{ state, bootstrapAsync, login, logout, deleteAccount }}>
      <AppLockProvider isLoggedIn={!state.isLoggedOut}>
        <DataProvider>
          <AppShell isLoggedOut={state.isLoggedOut} hacUrl={state.user?.hacUrl} />
        </DataProvider>
      </AppLockProvider>
    </AuthContext.Provider>
  );
}

const STATUS_ICONS: Record<Exclude<ServiceStatus, 'ok'>, keyof typeof Ionicons.glyphMap> = {
  'district-down': 'school-outline',
  'proxy-down': 'server-outline',
  offline: 'cloud-offline-outline',
};

function statusMessage(status: ServiceStatus, hacUrl?: string): string {
  if (status === 'district-down') return `HAC is down for ${districtName(hacUrl)}. Showing saved data.`;
  if (status === 'proxy-down') return 'Gradient is unreachable right now. Showing saved data.';
  return 'No internet connection. Showing saved data.';
}

function AppShell({ isLoggedOut, hacUrl }: { isLoggedOut: boolean; hacUrl?: string }) {
  const { locked } = useAppLock();
  const { scheme } = useTheme();
  const status = useServiceStatus();
  const banner =
    status === 'ok'
      ? null
      : { icon: STATUS_ICONS[status], message: statusMessage(status, hacUrl) };

  return (
    <View style={styles.root}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {locked ? (
        <LockScreen />
      ) : (
        <NavigationContainer>
          {isLoggedOut ? <AuthStack /> : <AppStack />}
        </NavigationContainer>
      )}
      {banner && (
        <View
          style={styles.statusBanner}
          pointerEvents="none"
          accessible
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          accessibilityLabel={banner.message}
        >
          <Ionicons name={banner.icon} size={12} color={UI_COLORS.dangerMuted} />
          <Text style={styles.statusText}>{banner.message}</Text>
        </View>
      )}
    </View>
  );
}

function RootNavigator() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <RootNavigatorContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default wrapRoot(RootNavigator);

const styles = StyleSheet.create({
  root: { flex: 1 },
  statusBanner: {
    alignItems: 'center',
    backgroundColor: 'rgba(15,15,15,0.80)',
    borderRadius: RADIUS.lg,
    bottom: 100,
    flexDirection: 'row',
    gap: SPACING.sm,
    justifyContent: 'center',
    left: 24,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    position: 'absolute',
    right: 24,
    zIndex: 9999,
  },
  statusText: { color: UI_COLORS.dangerMuted, flexShrink: 1, fontSize: FONT.sm, fontWeight: '500' },
});

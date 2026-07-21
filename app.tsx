import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from './context/auth-context';
import { ThemeProvider } from './context/theme-context';
import { DataProvider } from './context/data-context';
import { AppLockProvider, useAppLock } from './context/app-lock-context';
import { ErrorBoundary } from './components/error-boundary';
import { useAuth } from './hooks/use-auth';
import { useTheme } from './hooks/use-theme';
import { useNetworkStatus } from './hooks/use-network';
import { UI_COLORS } from './utils/colors';
import { FONT, RADIUS, SPACING } from './utils/tokens';
import { mark, measure } from './utils/perf';

mark('coldStart:start');

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
          } else if (route.name === 'Schedule') {
            iconName = focused ? 'calendar' : 'calendar-outline';
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
      <Tab.Screen name="Schedule" component={Schedule} options={{ title: 'Schedule' }} />
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
      <Stack.Screen name="Transcript" component={Transcript} options={{ presentation: 'modal' }} />
    </Stack.Navigator>
  );
}

function RootNavigatorContent() {
  const { state, bootstrapAsync, login, logout } = useAuth();
  const { currentTheme } = useTheme();
  const isOffline = useNetworkStatus();
  const [isBootstrapped, setIsBootstrapped] = useState(false);

  useEffect(() => {
    bootstrapAsync().then(() => setIsBootstrapped(true));
  }, [bootstrapAsync]);

  useEffect(() => {
    if (isBootstrapped) measure('coldStart', 'coldStart:start');
  }, [isBootstrapped]);

  if (!isBootstrapped || !currentTheme) return <LoadingScreen />;

  return (
    <AuthContext.Provider value={{ state, bootstrapAsync, login, logout }}>
      <AppLockProvider isLoggedIn={!state.isLoggedOut}>
        <DataProvider>
          <AppShell isLoggedOut={state.isLoggedOut} isOffline={isOffline} />
        </DataProvider>
      </AppLockProvider>
    </AuthContext.Provider>
  );
}

function AppShell({ isLoggedOut, isOffline }: { isLoggedOut: boolean; isOffline: boolean }) {
  const { locked } = useAppLock();

  return (
    <View style={styles.root}>
      {locked ? (
        <LockScreen />
      ) : (
        <NavigationContainer>
          {isLoggedOut ? <AuthStack /> : <AppStack />}
        </NavigationContainer>
      )}
      {isOffline && (
        <View
          style={styles.offlineBanner}
          pointerEvents="none"
          accessible
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          accessibilityLabel="No internet connection"
        >
          <Ionicons name="cloud-offline-outline" size={12} color={UI_COLORS.dangerMuted} />
          <Text style={styles.offlineText}>No internet connection</Text>
        </View>
      )}
    </View>
  );
}

export default function RootNavigator() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <RootNavigatorContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  offlineBanner: {
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
  offlineText: { color: UI_COLORS.dangerMuted, fontSize: FONT.sm, fontWeight: '500' },
  root: { flex: 1 },
});

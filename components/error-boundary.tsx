import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FALLBACK, UI_COLORS } from '../utils/colors';
import { logError } from '../utils/error-logger';
import { FONT, RADIUS, SPACING, TOUCH_TARGET } from '../utils/tokens';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// catches render errors and displays fallback UI with retry option
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logError(error, { action: 'ErrorBoundary', componentStack: errorInfo.componentStack });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Ionicons name="alert-circle" size={64} color={UI_COLORS.danger} />
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {this.state.error?.message ?? 'An unexpected error occurred'}
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={this.handleReset}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <Ionicons name="refresh" size={20} color={UI_COLORS.white} />
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: FALLBACK.primary,
    borderRadius: RADIUS.sm,
    flexDirection: 'row',
    gap: SPACING.sm,
    justifyContent: 'center',
    minHeight: TOUCH_TARGET,
    paddingHorizontal: SPACING.xxl,
  },
  buttonText: {
    color: UI_COLORS.white,
    fontSize: FONT.lg,
    fontWeight: '600',
  },
  container: {
    alignItems: 'center',
    backgroundColor: FALLBACK.background,
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.xxl,
  },
  message: {
    color: FALLBACK.textSecondary,
    fontSize: FONT.base,
    marginBottom: SPACING.xxxl,
    paddingHorizontal: SPACING.xxxl,
    textAlign: 'center',
  },
  title: {
    color: FALLBACK.text,
    fontSize: FONT.xxl,
    fontWeight: '700',
    marginBottom: SPACING.md,
    marginTop: SPACING.xxl,
  },
});

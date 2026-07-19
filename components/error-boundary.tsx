/* eslint-disable react-native/no-color-literals */
// error boundary uses hardcoded colors since it must work even if theme context crashes
import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
    // log to console for debugging (production: send to Sentry)
    console.error('error boundary caught:', error.message, errorInfo.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {this.state.error?.message ?? 'An unexpected error occurred'}
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Ionicons name="refresh" size={20} color="#fff" />
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
    backgroundColor: '#00F5A0',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  message: {
    color: '#999999',
    fontSize: 14,
    marginBottom: 32,
    paddingHorizontal: 32,
    textAlign: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 24,
  },
});

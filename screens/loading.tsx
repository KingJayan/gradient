import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BRAND, UI_COLORS } from '../utils/colors';
import { RADIUS, SPACING, TYPE } from '../utils/tokens';

export default function LoadingScreen() {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [spinAnim, fadeAnim, scaleAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container} accessible accessibilityRole="progressbar" accessibilityLabel="Loading your grades">
      <Animated.View
        style={[
          styles.iconContainer,
          {
            transform: [{ rotate: spin }, { scale: scaleAnim }],
            opacity: fadeAnim,
          },
        ]}
      >
        <View style={styles.gradientCircle}>
          <Ionicons name="checkmark-done" size={32} color={UI_COLORS.white} />
        </View>
      </Animated.View>
      <Animated.Text style={[styles.title, { opacity: fadeAnim }]}>
        Gradient
      </Animated.Text>
      <Animated.Text style={[styles.subtitle, { opacity: fadeAnim }]}>
        Loading your grades...
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: BRAND.background,
    flex: 1,
    justifyContent: 'center',
  },
  gradientCircle: {
    alignItems: 'center',
    backgroundColor: BRAND.primary,
    borderRadius: RADIUS.pill,
    elevation: 8,
    height: 80,
    justifyContent: 'center',
    shadowColor: BRAND.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    width: 80,
  },
  iconContainer: {
    marginBottom: SPACING.xl,
  },
  subtitle: {
    color: BRAND.textSecondary,
    fontSize: TYPE.body.size,
  },
  title: {
    color: BRAND.primary,
    fontSize: TYPE.hero.size,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
});

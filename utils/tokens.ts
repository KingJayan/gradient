export const SPACING = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  giant: 60,
} as const;

export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

export const FONT = {
  xs: 11,
  sm: 12,
  md: 13,
  base: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
  display: 28,
  hero: 32,
} as const;

export const TOUCH_TARGET = 44;

export const ELEVATION = {
  offset: { width: 0, height: 4 },
  radius: 8,
  android: 3,
  opacity: { light: 0.1, dark: 0.35 },
  pressedOpacity: { light: 0.04, dark: 0.15 },
  pressedScale: 0.985,
} as const;

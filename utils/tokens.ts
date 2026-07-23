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

export const TYPE = {
  hero: { size: 34, weight: '800', lineHeight: 40, maxScale: 1.3 },
  title: { size: 28, weight: '700', lineHeight: 34, maxScale: 1.3 },
  heading: { size: 20, weight: '700', lineHeight: 26, maxScale: 1.4 },
  body: { size: 17, weight: '400', lineHeight: 22, maxScale: 1.6 },
  subhead: { size: 15, weight: '500', lineHeight: 20, maxScale: 1.6 },
  caption: { size: 13, weight: '600', lineHeight: 16, maxScale: 1.3 },
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

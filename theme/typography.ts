export const typography = {
  h1: {
    fontFamily: 'Roboto-Bold',
    fontSize: 30,
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: 'Roboto-Bold',
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  h3: {
    fontFamily: 'Roboto-Bold',
    fontSize: 24,
    lineHeight: 34,
    letterSpacing: -0.4,
  },
  subheading: {
    fontFamily: 'Roboto-Bold',
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  title1: {
    fontFamily: 'Roboto-Bold',
    fontSize: 18,
    lineHeight: 26,
    letterSpacing: -0.4,
  },
  title2: {
    fontFamily: 'Roboto-Bold',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  title3: {
    fontFamily: 'Roboto-Bold',
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  body1: {
    fontFamily: 'Roboto-Regular',
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  body1Long: {
    fontFamily: 'Roboto-Regular',
    fontSize: 14,
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  body2: {
    fontFamily: 'Roboto-Regular',
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: -0.3,
  },
  body2Long: {
    fontFamily: 'Roboto-Regular',
    fontSize: 12,
    lineHeight: 20,
    letterSpacing: -0.3,
  },
  caption: {
    fontFamily: 'Roboto-Regular',
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: -0.2,
  },
} as const;

export type TypographyVariant = keyof typeof typography;
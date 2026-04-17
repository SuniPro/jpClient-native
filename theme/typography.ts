export const typography = {
    h1: {
        fontSize: 32,
        lineHeight: 42,
        fontWeight: "700" as const,
        letterSpacing: -0.5,
    },
    h2: {
        fontSize: 28,
        lineHeight: 36,
        fontWeight: "700" as const,
        letterSpacing: -0.5,
    },
    h3: {
        fontSize: 24,
        lineHeight: 34,
        fontWeight: "700" as const,
        letterSpacing: -0.4,
    },
    subheading: {
        fontSize: 20,
        lineHeight: 28,
        fontWeight: "700" as const,
        letterSpacing: -0.4,
    },
    title1: {
        fontSize: 18,
        lineHeight: 26,
        fontWeight: "700" as const,
        letterSpacing: -0.4,
    },
    title2: {
        fontSize: 16,
        lineHeight: 24,
        fontWeight: "700" as const,
        letterSpacing: -0.3,
    },
    title3: {
        fontSize: 14,
        lineHeight: 20,
        fontWeight: "700" as const,
        letterSpacing: -0.3,
    },
    body1: {
        fontSize: 16,
        lineHeight: 24,
        fontWeight: "400" as const,
        letterSpacing: -0.3,
    },
    body1Long: {
        fontSize: 16,
        lineHeight: 26,
        fontWeight: "400" as const,
        letterSpacing: -0.3,
    },
    body2: {
        fontSize: 14,
        lineHeight: 20,
        fontWeight: "400" as const,
        letterSpacing: -0.3,
    },
    body2Long: {
        fontSize: 14,
        lineHeight: 22,
        fontWeight: "400" as const,
        letterSpacing: -0.3,
    },
    caption: {
        fontSize: 12,
        lineHeight: 16,
        fontWeight: "400" as const,
        letterSpacing: -0.2,
    },
} as const;

export type TypographyVariant = keyof typeof typography;

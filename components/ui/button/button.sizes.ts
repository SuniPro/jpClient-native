import type { ButtonSize, ButtonSizeToken } from "./button.types";

export const buttonSizes: Record<ButtonSize, ButtonSizeToken> = {
    xl: {
        height: 56,
        paddingHorizontal: 20,
        borderRadius: 8,
        gap: 8,
        iconSize: 20,
        textVariant: "title2",
    },
    lg: {
        height: 48,
        paddingHorizontal: 16,
        borderRadius: 8,
        gap: 8,
        iconSize: 18,
        textVariant: "title2",
    },
    md: {
        height: 40,
        paddingHorizontal: 14,
        borderRadius: 8,
        gap: 6,
        iconSize: 18,
        textVariant: "title3",
    },
    sm: {
        height: 32,
        paddingHorizontal: 12,
        borderRadius: 8,
        gap: 4,
        iconSize: 16,
        textVariant: "body2",
    },
    xs: {
        height: 26,
        paddingHorizontal: 8,
        borderRadius: 8,
        gap: 4,
        iconSize: 14,
        textVariant: "caption",
    },
};

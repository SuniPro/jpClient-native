import type { AppTheme } from "@/theme";

export type ButtonVariant = "solid" | "ghost" | "extra";
export type ButtonColor = "primary" | "secondary" | "tertiary" | "danger";
export type ButtonSize = "xl" | "lg" | "md" | "sm" | "xs";

export type TypographyVariant = keyof AppTheme["typography"];

export type ButtonVisualState = {
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
    textColor: string;
    iconColor: string;
};

export type ButtonColorScale = {
    default: ButtonVisualState;
    active: ButtonVisualState;
    disabled: ButtonVisualState;
};

export type ButtonVariantTokens = Record<ButtonColor, ButtonColorScale>;

export type ButtonTokens = Record<ButtonVariant, ButtonVariantTokens>;

export type ButtonSizeToken = {
    height: number;
    paddingHorizontal: number;
    borderRadius: number;
    gap: number;
    iconSize: number;
    textVariant: TypographyVariant;
};

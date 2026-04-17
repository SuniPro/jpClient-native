import { ViewStyle } from "react-native";
import { radius } from "./radius";
import { spacing, space } from "./spacing";
import { typography } from "./typography";

export type AppTheme = {
    dark: boolean;
    colors: {
        primary: string;
        positive: string;
        information: string;
        notice: string;
        negative: string;

        backgroundPrimary: string;
        backgroundSecondary: string;
        backgroundTertiary: string;
        backgroundDisabled: string;
        backgroundDimmed: string;
        toastBackground: string;

        backgroundSystemPositive: string;
        backgroundSystemInformation: string;
        backgroundSystemNotice: string;
        backgroundSystemNegative: string;

        textPrimary: string;
        textSecondary: string;
        textTertiary: string;
        textPlaceholder: string;
        textDisabled: string;
        textAccent: string;
        textOn: string;

        textSystemPositive: string;
        textSystemInformation: string;
        textSystemNotice: string;
        textSystemNegative: string;

        borderPrimary: string;
        borderSecondary: string;

        iconDefault: string;

        buttonTertiaryBackground: string,
        buttonTertiaryBorder: string,
        buttonTertiaryText: string,
    };
    spacing: typeof spacing;
    space: typeof space;
    radius: typeof radius;
    shadows: {
        default: ViewStyle;
        accent: ViewStyle;
    };
    typography: typeof typography;
};

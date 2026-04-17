import { palette } from "./palette";
import { radius } from "./radius";
import { shadows } from "./shadows";
import { spacing, space } from "./spacing";
import { typography } from "./typography";
import type { AppTheme } from "./types";

export const darkTheme: AppTheme = {
    dark: true,
    colors: {
        primary: palette.blue500,
        positive: palette.green500,
        information: palette.blue500,
        notice: palette.orange500,
        negative: palette.red500,

        backgroundPrimary: palette.black,
        backgroundSecondary: "#2E3033",
        backgroundTertiary: "#43464C",
        backgroundDisabled: "#585D65",
        backgroundDimmed: palette.overlayBlack40,
        toastBackground: palette.toastDark,

        backgroundSystemPositive: "#19592F",
        backgroundSystemInformation: "#194659",
        backgroundSystemNotice: "#6C4D19",
        backgroundSystemNegative: "#591D19",

        textPrimary: "#F2F3F5",
        textSecondary: "#CDD0D6",
        textTertiary: "#9AA1AC",
        textPlaceholder: "#9AA1AC",
        textDisabled: "#43464C",
        textAccent: "#2BC0FF",
        textOn: palette.white,

        textSystemPositive: "#59FF91",
        textSystemInformation: "#59CDFF",
        textSystemNotice: "#FFC66C",
        textSystemNegative: "#FF6259",

        borderPrimary: "#6C737E",
        borderSecondary: "#43464C",

        iconDefault: "#6C737E",

        buttonTertiaryBackground: palette.blue900,
        buttonTertiaryBorder: palette.blue700,
        buttonTertiaryText: palette.blue100,
    },
    spacing,
    space,
    radius,
    shadows,
    typography,
};

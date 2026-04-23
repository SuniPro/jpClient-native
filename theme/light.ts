import { palette } from './palette';
import { radius } from './radius';
import { shadows } from './shadows';
import { space, spacing } from './spacing';
import type { AppTheme } from './types';
import { typography } from './typography';

export const lightTheme: AppTheme = {
  dark: false,
  colors: {
    primary: palette.blue500,
    positive: palette.green500,
    information: palette.blue500,
    notice: palette.orange500,
    negative: palette.red500,

    backgroundPrimary: palette.white,
    backgroundSecondary: palette.gray50,
    backgroundTertiary: palette.white,
    backgroundDisabled: palette.gray200,
    backgroundDimmed: palette.overlayBlack40,
    toastBackground: palette.toastLight,

    backgroundSystemPositive: palette.green50,
    backgroundSystemInformation: palette.blue50,
    backgroundSystemNotice: palette.orange50,
    backgroundSystemNegative: palette.red50,

    textPrimary: palette.black,
    textSecondary: palette.gray700,
    textTertiary: palette.gray500,
    textPlaceholder: palette.gray300,
    textDisabled: palette.gray100,
    textAccent: palette.blue500,
    textOn: palette.white,

    textSystemPositive: palette.green600,
    textSystemInformation: palette.blue600,
    textSystemNotice: palette.orange600,
    textSystemNegative: palette.red600,

    borderPrimary: palette.gray300,
    borderSecondary: palette.gray100,

    iconDefault: palette.gray300,

    buttonTertiaryBackground: palette.blue50,
    buttonTertiaryBorder: palette.blue100,
    buttonTertiaryText: palette.blue700,
  },
  spacing,
  space,
  radius,
  shadows,
  typography,
};

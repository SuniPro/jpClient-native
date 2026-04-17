import {AppTheme} from "@/theme";
import {ButtonTokens} from "@/components/ui/button/button.types";

export function createButtonTokens(theme: AppTheme): ButtonTokens {
    return {
        solid: {
            primary: {
                default: {
                    backgroundColor: theme.colors.primary,
                    borderColor: theme.colors.primary,
                    borderWidth: 1,
                    textColor: theme.colors.textOn,
                    iconColor: theme.colors.textOn,
                },
                active: {
                    backgroundColor: theme.colors.textSystemInformation,
                    borderColor: theme.colors.textSystemInformation,
                    borderWidth: 1,
                    textColor: theme.colors.textOn,
                    iconColor: theme.colors.textOn,
                },
                disabled: {
                    backgroundColor: theme.colors.backgroundDisabled,
                    borderColor: theme.colors.backgroundDisabled,
                    borderWidth: 1,
                    textColor: theme.colors.textDisabled,
                    iconColor: theme.colors.textDisabled,
                },
            },

            secondary: {
                default: {
                    backgroundColor: theme.colors.backgroundSecondary,
                    borderColor: theme.colors.borderSecondary,
                    borderWidth: 1,
                    textColor: theme.colors.textPrimary,
                    iconColor: theme.colors.textPrimary,
                },
                active: {
                    backgroundColor: theme.colors.backgroundTertiary,
                    borderColor: theme.colors.borderPrimary,
                    borderWidth: 1,
                    textColor: theme.colors.textPrimary,
                    iconColor: theme.colors.textPrimary,
                },
                disabled: {
                    backgroundColor: theme.colors.backgroundDisabled,
                    borderColor: theme.colors.backgroundDisabled,
                    borderWidth: 1,
                    textColor: theme.colors.textDisabled,
                    iconColor: theme.colors.textDisabled,
                },
            },

            tertiary: {
                default: {
                    backgroundColor: theme.colors.buttonTertiaryBackground,
                    borderColor: theme.colors.buttonTertiaryBorder,
                    borderWidth: 1,
                    textColor: theme.colors.buttonTertiaryText,
                    iconColor: theme.colors.buttonTertiaryText,
                },
                active: {
                    backgroundColor: theme.colors.buttonTertiaryBorder,
                    borderColor: theme.colors.buttonTertiaryBorder,
                    borderWidth: 1,
                    textColor: theme.colors.buttonTertiaryText,
                    iconColor: theme.colors.buttonTertiaryText,
                },
                disabled: {
                    backgroundColor: theme.colors.backgroundDisabled,
                    borderColor: theme.colors.backgroundDisabled,
                    borderWidth: 1,
                    textColor: theme.colors.textDisabled,
                    iconColor: theme.colors.textDisabled,
                },
            },

            danger: {
                default: {
                    backgroundColor: theme.colors.negative,
                    borderColor: theme.colors.negative,
                    borderWidth: 1,
                    textColor: theme.colors.textOn,
                    iconColor: theme.colors.textOn,
                },
                active: {
                    backgroundColor: theme.colors.textSystemNegative,
                    borderColor: theme.colors.textSystemNegative,
                    borderWidth: 1,
                    textColor: theme.colors.textOn,
                    iconColor: theme.colors.textOn,
                },
                disabled: {
                    backgroundColor: theme.colors.backgroundDisabled,
                    borderColor: theme.colors.backgroundDisabled,
                    borderWidth: 1,
                    textColor: theme.colors.textDisabled,
                    iconColor: theme.colors.textDisabled,
                },
            },
        },

        ghost: {
            primary: {
                default: {
                    backgroundColor: "transparent",
                    borderColor: theme.colors.primary,
                    borderWidth: 1,
                    textColor: theme.colors.primary,
                    iconColor: theme.colors.primary,
                },
                active: {
                    backgroundColor: theme.colors.backgroundSystemInformation,
                    borderColor: theme.colors.primary,
                    borderWidth: 1,
                    textColor: theme.colors.primary,
                    iconColor: theme.colors.primary,
                },
                disabled: {
                    backgroundColor: "transparent",
                    borderColor: theme.colors.borderSecondary,
                    borderWidth: 1,
                    textColor: theme.colors.textDisabled,
                    iconColor: theme.colors.textDisabled,
                },
            },

            secondary: {
                default: {
                    backgroundColor: "transparent",
                    borderColor: theme.colors.borderPrimary,
                    borderWidth: 1,
                    textColor: theme.colors.textPrimary,
                    iconColor: theme.colors.textPrimary,
                },
                active: {
                    backgroundColor: theme.colors.backgroundSecondary,
                    borderColor: theme.colors.borderPrimary,
                    borderWidth: 1,
                    textColor: theme.colors.textPrimary,
                    iconColor: theme.colors.textPrimary,
                },
                disabled: {
                    backgroundColor: "transparent",
                    borderColor: theme.colors.borderSecondary,
                    borderWidth: 1,
                    textColor: theme.colors.textDisabled,
                    iconColor: theme.colors.textDisabled,
                },
            },

            tertiary: {
                default: {
                    backgroundColor: "transparent",
                    borderColor: "transparent",
                    borderWidth: 1,
                    textColor: theme.colors.textSecondary,
                    iconColor: theme.colors.textSecondary,
                },
                active: {
                    backgroundColor: theme.colors.backgroundSecondary,
                    borderColor: "transparent",
                    borderWidth: 1,
                    textColor: theme.colors.textPrimary,
                    iconColor: theme.colors.textPrimary,
                },
                disabled: {
                    backgroundColor: "transparent",
                    borderColor: "transparent",
                    borderWidth: 1,
                    textColor: theme.colors.textDisabled,
                    iconColor: theme.colors.textDisabled,
                },
            },

            danger: {
                default: {
                    backgroundColor: "transparent",
                    borderColor: theme.colors.negative,
                    borderWidth: 1,
                    textColor: theme.colors.negative,
                    iconColor: theme.colors.negative,
                },
                active: {
                    backgroundColor: theme.colors.backgroundSystemNegative,
                    borderColor: theme.colors.negative,
                    borderWidth: 1,
                    textColor: theme.colors.negative,
                    iconColor: theme.colors.negative,
                },
                disabled: {
                    backgroundColor: "transparent",
                    borderColor: theme.colors.borderSecondary,
                    borderWidth: 1,
                    textColor: theme.colors.textDisabled,
                    iconColor: theme.colors.textDisabled,
                },
            },
        },

        extra: {
            primary: {
                default: {
                    backgroundColor: "transparent",
                    borderColor: "transparent",
                    borderWidth: 0,
                    textColor: theme.colors.primary,
                    iconColor: theme.colors.primary,
                },
                active: {
                    backgroundColor: "transparent",
                    borderColor: "transparent",
                    borderWidth: 0,
                    textColor: theme.colors.textSystemInformation,
                    iconColor: theme.colors.textSystemInformation,
                },
                disabled: {
                    backgroundColor: "transparent",
                    borderColor: "transparent",
                    borderWidth: 0,
                    textColor: theme.colors.textDisabled,
                    iconColor: theme.colors.textDisabled,
                },
            },

            secondary: {
                default: {
                    backgroundColor: "transparent",
                    borderColor: "transparent",
                    borderWidth: 0,
                    textColor: theme.colors.textPrimary,
                    iconColor: theme.colors.textPrimary,
                },
                active: {
                    backgroundColor: "transparent",
                    borderColor: "transparent",
                    borderWidth: 0,
                    textColor: theme.colors.textSecondary,
                    iconColor: theme.colors.textSecondary,
                },
                disabled: {
                    backgroundColor: "transparent",
                    borderColor: "transparent",
                    borderWidth: 0,
                    textColor: theme.colors.textDisabled,
                    iconColor: theme.colors.textDisabled,
                },
            },

            tertiary: {
                default: {
                    backgroundColor: "transparent",
                    borderColor: "transparent",
                    borderWidth: 0,
                    textColor: theme.colors.textSecondary,
                    iconColor: theme.colors.textSecondary,
                },
                active: {
                    backgroundColor: "transparent",
                    borderColor: "transparent",
                    borderWidth: 0,
                    textColor: theme.colors.textPrimary,
                    iconColor: theme.colors.textPrimary,
                },
                disabled: {
                    backgroundColor: "transparent",
                    borderColor: "transparent",
                    borderWidth: 0,
                    textColor: theme.colors.textDisabled,
                    iconColor: theme.colors.textDisabled,
                },
            },

            danger: {
                default: {
                    backgroundColor: "transparent",
                    borderColor: "transparent",
                    borderWidth: 0,
                    textColor: theme.colors.negative,
                    iconColor: theme.colors.negative,
                },
                active: {
                    backgroundColor: "transparent",
                    borderColor: "transparent",
                    borderWidth: 0,
                    textColor: theme.colors.textSystemNegative,
                    iconColor: theme.colors.textSystemNegative,
                },
                disabled: {
                    backgroundColor: "transparent",
                    borderColor: "transparent",
                    borderWidth: 0,
                    textColor: theme.colors.textDisabled,
                    iconColor: theme.colors.textDisabled,
                },
            },
        },
    };
}

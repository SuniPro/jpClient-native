import { useTheme } from '@/theme';
import type { TypographyVariant } from '@/theme/typography';
import { Text as RNText, type TextProps } from 'react-native';

type TextColor = 'primary' | 'secondary' | 'tertiary' | 'accent' | 'disabled' | 'on';

type Props = TextProps & {
  variant?: TypographyVariant;
  color?: TextColor;
};

export function AppText({ variant = 'body1', color = 'primary', style, ...props }: Props) {
  const theme = useTheme();
  const typo = theme.typography[variant];

  const colorMap = {
    primary: theme.colors.textPrimary,
    secondary: theme.colors.textSecondary,
    tertiary: theme.colors.textTertiary,
    accent: theme.colors.textAccent,
    disabled: theme.colors.textDisabled,
    on: theme.colors.textOn,
  };

  return (
    <RNText
      {...props}
      style={[
        {
          fontFamily: typo.fontFamily,
          fontSize: typo.fontSize,
          lineHeight: typo.lineHeight,
          fontWeight: typo.fontWeight,
          letterSpacing: typo.letterSpacing,
          color: colorMap[color],
        },
        style,
      ]}
    />
  );
}

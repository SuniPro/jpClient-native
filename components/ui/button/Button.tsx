import React from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
    type PressableProps,
    type StyleProp,
    type ViewStyle,
} from "react-native";

import { useTheme } from "@/theme";
import { buttonSizes } from "./button.sizes";
import { createButtonTokens } from "./button.tokens";
import type { ButtonColor, ButtonSize, ButtonVariant } from "./button.types";

export type ButtonProps = Omit<PressableProps, "style" | "children"> & {
    label: string;
    variant?: ButtonVariant;
    color?: ButtonColor;
    size?: ButtonSize;
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    leftIcon?: IconElement;
    rightIcon?: IconElement;
    style?: StyleProp<ViewStyle>;
};

export default function Button({
                                   label,
                                   variant = "solid",
                                   color = "primary",
                                   size = "lg",
                                   disabled = false,
                                   loading = false,
                                   fullWidth = false,
                                   leftIcon,
                                   rightIcon,
                                   style,
                                   onPress,
                                   ...props
                               }: ButtonProps) {
    const theme = useTheme();

    const tokens = createButtonTokens(theme);
    const sizeToken = buttonSizes[size];
    const typographyToken = theme.typography[sizeToken.textVariant];

    const isDisabled = disabled || loading;

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isDisabled, busy: loading }}
            disabled={isDisabled}
            onPress={onPress}
            style={({ pressed, hovered }) => {
                const state = isDisabled
                    ? "disabled"
                    : pressed || hovered
                        ? "active"
                        : "default";

                const visual = tokens[variant][color][state];

                return [
                    styles.base,
                    {
                        minHeight: sizeToken.height,
                        paddingHorizontal: sizeToken.paddingHorizontal,
                        borderRadius: sizeToken.borderRadius,
                        backgroundColor: visual.backgroundColor,
                        borderColor: visual.borderColor,
                        borderWidth: visual.borderWidth,
                        width: fullWidth ? "100%" : undefined,
                    },
                    style,
                ];
            }}
            {...props}
        >
            {({ pressed, hovered }) => {
                const state = isDisabled
                    ? "disabled"
                    : pressed || hovered
                        ? "active"
                        : "default";

                const visual = tokens[variant][color][state];

                const iconElementColor =
                    loading ? theme.colors.textDisabled : visual.iconColor;

                return (
                    <View style={[styles.content, { gap: sizeToken.gap }]}>
                        {loading ? (
                            <ActivityIndicator
                                size="small"
                                color={visual.textColor}
                            />
                        ) : (
                            <>
                                {leftIcon ? (
                                    <View style={styles.iconWrapper}>
                                        {renderIcon(leftIcon, iconElementColor, sizeToken.iconSize)}
                                    </View>
                                ) : null}

                                <Text
                                    numberOfLines={1}
                                    style={[
                                        styles.label,
                                        {
                                            color: visual.textColor,
                                            fontSize: typographyToken.fontSize,
                                            lineHeight: typographyToken.lineHeight,
                                            fontWeight: typographyToken.fontWeight,
                                            letterSpacing: typographyToken.letterSpacing,
                                        },
                                    ]}
                                >
                                    {label}
                                </Text>

                                {rightIcon ? (
                                    <View style={styles.iconWrapper}>
                                        {renderIcon(rightIcon, iconElementColor, sizeToken.iconSize)}
                                    </View>
                                ) : null}
                            </>
                        )}
                    </View>
                );
            }}
        </Pressable>
    );
}

type IconElement = React.ReactElement<{
    color?: string;
    size?: number;
}>

function renderIcon(
    icon: IconElement | undefined,
    color: string,
    size: number
): React.ReactNode {
    if (!React.isValidElement(icon)) {
        return icon;
    }

    const props: Record<string, unknown> = {};

    if (icon.props.color !== undefined) {
        props.color = color;
    }

    if (icon.props.size !== undefined) {
        props.size = size;
    }

    return React.cloneElement(icon, props);
}

const styles = StyleSheet.create({
    base: {
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    content: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    label: {
        textAlign: "center",
        includeFontPadding: false,
    },
    iconWrapper: {
        alignItems: "center",
        justifyContent: "center",
    },
});

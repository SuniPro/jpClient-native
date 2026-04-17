import { Platform, ViewStyle } from "react-native";

const iosShadowDefault: ViewStyle = {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
};

const iosShadowAccent: ViewStyle = {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
};

const androidShadowDefault: ViewStyle = {
    elevation: 2,
};

const androidShadowAccent: ViewStyle = {
    elevation: 4,
};

export const shadows = {
    default: Platform.select({
        ios: iosShadowDefault,
        android: androidShadowDefault,
        default: iosShadowDefault,
    }) as ViewStyle,

    accent: Platform.select({
        ios: iosShadowAccent,
        android: androidShadowAccent,
        default: iosShadowAccent,
    }) as ViewStyle,
} as const;

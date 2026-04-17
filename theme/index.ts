import { useColorScheme } from "react-native";
import { darkTheme } from "./dark";
import { lightTheme } from "./light";

export * from "./types";
export * from "./palette";
export * from "./spacing";
export * from "./radius";
export * from "./shadows";
export * from "./typography";

export const themes = {
    light: lightTheme,
    dark: darkTheme,
} as const;

export function useTheme() {
    const scheme = useColorScheme();
    return scheme === "dark" ? darkTheme : lightTheme;
}

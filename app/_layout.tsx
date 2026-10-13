import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [fontsLoaded] = useFonts({
    Pretendard: require('@/assets/font/pretendard/Pretendard-Regular.otf'),
    'Pretendard-Thin': require('@/assets/font/pretendard/Pretendard-Thin.otf'),
    'Pretendard-ExtraLight': require('@/assets/font/pretendard/Pretendard-ExtraLight.otf'),
    'Pretendard-Light': require('@/assets/font/pretendard/Pretendard-Light.otf'),
    'Pretendard-Regular': require('@/assets/font/pretendard/Pretendard-Regular.otf'),
    'Pretendard-Medium': require('@/assets/font/pretendard/Pretendard-Medium.otf'),
    'Pretendard-SemiBold': require('@/assets/font/pretendard/Pretendard-SemiBold.otf'),
    'Pretendard-Bold': require('@/assets/font/pretendard/Pretendard-Bold.otf'),
    'Pretendard-ExtraBold': require('@/assets/font/pretendard/Pretendard-ExtraBold.otf'),
    'Pretendard-Black': require('@/assets/font/pretendard/Pretendard-Black.otf'),

    PretendardJP: require('@/assets/font/pretendard/jp/PretendardJP-Regular.otf'),
    'PretendardJP-Thin': require('@/assets/font/pretendard/jp/PretendardJP-Thin.otf'),
    'PretendardJP-ExtraLight': require('@/assets/font/pretendard/jp/PretendardJP-ExtraLight.otf'),
    'PretendardJP-Light': require('@/assets/font/pretendard/jp/PretendardJP-Light.otf'),
    'PretendardJP-Regular': require('@/assets/font/pretendard/jp/PretendardJP-Regular.otf'),
    'PretendardJP-Medium': require('@/assets/font/pretendard/jp/PretendardJP-Medium.otf'),
    'PretendardJP-SemiBold': require('@/assets/font/pretendard/jp/PretendardJP-SemiBold.otf'),
    'PretendardJP-Bold': require('@/assets/font/pretendard/jp/PretendardJP-Bold.otf'),
    'PretendardJP-ExtraBold': require('@/assets/font/pretendard/jp/PretendardJP-ExtraBold.otf'),
    'PretendardJP-Black': require('@/assets/font/pretendard/jp/PretendardJP-Black.otf'),

    BlackHanSans: require('@/assets/font/blackHanSans/BlackHanSans-Regular.ttf'),
    'BlackHanSans-Regular': require('@/assets/font/blackHanSans/BlackHanSans-Regular.ttf'),

    Hahmlet: require('@/assets/font/hahmlet/Hahmlet-Regular.otf'),
    'Hahmlet-Thin': require('@/assets/font/hahmlet/Hahmlet-Thin.otf'),
    'Hahmlet-ExtraLight': require('@/assets/font/hahmlet/Hahmlet-ExtraLight.otf'),
    'Hahmlet-Light': require('@/assets/font/hahmlet/Hahmlet-Light.otf'),
    'Hahmlet-Regular': require('@/assets/font/hahmlet/Hahmlet-Regular.otf'),
    'Hahmlet-Medium': require('@/assets/font/hahmlet/Hahmlet-Medium.otf'),
    'Hahmlet-SemiBold': require('@/assets/font/hahmlet/Hahmlet-SemiBold.otf'),
    'Hahmlet-Bold': require('@/assets/font/hahmlet/Hahmlet-Bold.otf'),
    'Hahmlet-ExtraBold': require('@/assets/font/hahmlet/Hahmlet-ExtraBold.otf'),
    'Hahmlet-Black': require('@/assets/font/hahmlet/Hahmlet-Black.otf'),

    GamtanBatang: require('@/assets/font/gamtanBatang/gamtanBatang-Regular.otf'),
    'GamtanBatang-Thin': require('@/assets/font/gamtanBatang/gamtanBatang-Thin.otf'),
    'GamtanBatang-Regular': require('@/assets/font/gamtanBatang/gamtanBatang-Regular.otf'),
    'GamtanBatang-Bold': require('@/assets/font/gamtanBatang/gamtanBatang-Bold.otf'),

    GamtanDotum: require('@/assets/font/gamtanDotum/gamtanDotum-Regular.otf'),
    'GamtanDotum-Thin': require('@/assets/font/gamtanDotum/gamtanDotum-Thin.otf'),
    'GamtanDotum-Regular': require('@/assets/font/gamtanDotum/gamtanDotum-Regular.otf'),
    'GamtanDotum-Bold': require('@/assets/font/gamtanDotum/gamtanDotum-Bold.otf'),

    Inter: require('@/assets/font/inter/Inter_18pt-Regular.ttf'),
    'Inter-Thin': require('@/assets/font/inter/Inter_18pt-Thin.ttf'),
    'Inter-ExtraLight': require('@/assets/font/inter/Inter_18pt-ExtraLight.ttf'),
    'Inter-Light': require('@/assets/font/inter/Inter_18pt-Light.ttf'),
    'Inter-Regular': require('@/assets/font/inter/Inter_18pt-Regular.ttf'),
    'Inter-Medium': require('@/assets/font/inter/Inter_18pt-Medium.ttf'),
    'Inter-SemiBold': require('@/assets/font/inter/Inter_18pt-SemiBold.ttf'),
    'Inter-Bold': require('@/assets/font/inter/Inter_18pt-Bold.ttf'),
    'Inter-ExtraBold': require('@/assets/font/inter/Inter_18pt-ExtraBold.ttf'),
    'Inter-Black': require('@/assets/font/inter/Inter_18pt-Black.ttf'),

    Roboto: require('@/assets/font/roboto/Roboto-Regular.ttf'),
    'Roboto-Thin': require('@/assets/font/roboto/Roboto-Thin.ttf'),
    'Roboto-ExtraLight': require('@/assets/font/roboto/Roboto-ExtraLight.ttf'),
    'Roboto-Light': require('@/assets/font/roboto/Roboto-Light.ttf'),
    'Roboto-Regular': require('@/assets/font/roboto/Roboto-Regular.ttf'),
    'Roboto-Medium': require('@/assets/font/roboto/Roboto-Medium.ttf'),
    'Roboto-SemiBold': require('@/assets/font/roboto/Roboto-SemiBold.ttf'),
    'Roboto-Bold': require('@/assets/font/roboto/Roboto-Bold.ttf'),
    'Roboto-ExtraBold': require('@/assets/font/roboto/Roboto-ExtraBold.ttf'),
    'Roboto-Black': require('@/assets/font/roboto/Roboto-Black.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen name="post" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}
